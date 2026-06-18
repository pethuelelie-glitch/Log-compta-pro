import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listRecettes, listDepenses, listClients, listFournisseurs,
  type Recette, type Depense, type Client, type Fournisseur,
  CATEGORIES_RECETTES, CATEGORIES_DEPENSES, MODES_PAIEMENT,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtMoney, fmtDate } from "@/lib/format";
import { APP_NAME } from "@/lib/brand";
import {
  Plus, Pencil, Trash2, Search, CalendarRange, X, Tag, CreditCard, Hash, User, FileText,
  CalendarDays, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Kind = "recettes" | "depenses";
type Row = Recette | Depense;

type InvoiceData = {
  date: string;
  montant: number | string;
  description: string;
  categorie?: string | null;
  mode_paiement?: string | null;
  reference?: string | null;
  client?: Client | null;
};

export function TransactionPage({ kind, title }: { kind: Kind; title: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [kind],
    queryFn: kind === "recettes" ? listRecettes : listDepenses,
  });

  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: listClients, enabled: kind === "recettes" });
  const fournisseursQuery = useQuery({ queryKey: ["fournisseurs"], queryFn: listFournisseurs, enabled: kind === "depenses" });

  const tiersList = kind === "recettes" ? (clientsQuery.data ?? []) : (fournisseursQuery.data ?? []);

  const [search, setSearch]         = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [catFilter, setCatFilter]   = useState("__all__");
  const [openForm, setOpenForm]     = useState(false);
  const [editing, setEditing]       = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [nextRef, setNextRef]       = useState("");

  const categories = kind === "recettes" ? CATEGORIES_RECETTES : CATEGORIES_DEPENSES;

  const filtered = (query.data ?? []).filter((r) => {
    const tierName = (r as Recette).client?.nom || (r as Depense).fournisseur?.nom || "";
    const matchSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.categorie ?? "").toLowerCase().includes(search.toLowerCase()) ||
      tierName.toLowerCase().includes(search.toLowerCase()) ||
      String(r.montant).includes(search);
    const matchFrom = !dateFrom || r.date >= dateFrom;
    const matchTo   = !dateTo   || r.date <= dateTo;
    const matchCat  = catFilter === "__all__" || r.categorie === catFilter;
    return matchSearch && matchFrom && matchTo && matchCat;
  });

  const total    = filtered.reduce((s, x) => s + Number(x.montant), 0);
  const hasFilter = !!search || !!dateFrom || !!dateTo || catFilter !== "__all__";

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setCatFilter("__all__");
  };

  // --- Raccourcis de période ---
  const applyPeriod = (period: "today" | "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (period === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (period === "thisMonth") {
      setDateFrom(`${today.slice(0, 7)}-01`);
      setDateTo(today);
    } else if (period === "lastMonth") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(lm.toISOString().slice(0, 10));
      setDateTo(lme.toISOString().slice(0, 10));
    } else if (period === "thisYear") {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(today);
    }
  };

  const computeNextRef = () => {
    const year = new Date().getFullYear();
    const prefix = kind === "recettes" ? "FAC" : "DEP";
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    let max = 0;
    for (const r of query.data ?? []) {
      if (r.reference) {
        const m = r.reference.match(pattern);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      }
    }
    return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
  };

  const upsert = useMutation({
    mutationFn: async (payload: {
      id?: string;
      date: string;
      montant: number;
      description: string;
      categorie: string;
      mode_paiement: string;
      reference: string;
      tier_id: string;
    }) => {
      const body: Record<string, unknown> = {
        date: payload.date,
        montant: payload.montant,
        description: payload.description,
        categorie: payload.categorie || null,
        mode_paiement: payload.mode_paiement || null,
        reference: payload.reference || null,
      };

      if (kind === "recettes") {
        body.client_id = payload.tier_id === "none" ? null : payload.tier_id;
      } else {
        body.fournisseur_id = payload.tier_id === "none" ? null : payload.tier_id;
      }

      if (payload.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from(kind).update(body as any).eq("id", payload.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from(kind).insert(body as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind] });
      const label = kind === "recettes" ? "Recette" : "Dépense";
      toast.success(editing ? `${label} modifiée avec succès ✓` : `${label} ajoutée avec succès ✓`);
      setOpenForm(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(kind).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind] });
      const label = kind === "recettes" ? "Recette" : "Dépense";
      toast.success(`${label} supprimée`);
      setConfirmDel(null);
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const generateInvoice = (data: InvoiceData) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 28, "F");

    // Logo "CV" box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 6, 12, 12, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text("CV", 20, 14, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(APP_NAME, 30, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Généré le " + new Date().toLocaleDateString("fr-FR"), 160, 24, { align: "center" });

    const docTitle = data.client ? "FACTURE" : "REÇU";
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(docTitle, 14, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date : ${fmtDate(data.date)}`, 14, 53);
    if (data.reference) doc.text(`Référence : ${data.reference}`, 14, 59);

    if (data.client) {
      doc.setFont("helvetica", "bold");
      doc.text("Facturé à :", 120, 45);
      doc.setFont("helvetica", "normal");
      doc.text(data.client.nom, 120, 52);
      if (data.client.adresse) doc.text(data.client.adresse, 120, 58);
      if (data.client.telephone) doc.text(`Tél : ${data.client.telephone}`, 120, 64);
      if (data.client.email) doc.text(data.client.email, 120, 70);
    }

    autoTable(doc, {
      startY: data.client ? 85 : 75,
      head: [["Description", "Catégorie", "Total HT"]],
      body: [
        [data.description || "—", data.categorie || "—", fmtMoney(data.montant)],
      ],
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [250, 250, 255] },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total TTC : ${fmtMoney(data.montant)}`, 145, finalY);

    if (data.mode_paiement) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Mode de règlement : ${data.mode_paiement}`, 14, finalY);
      doc.text(`Acquittée — net à payer : 0 FCFA.`, 14, finalY + 6);
    }

    const suffix = data.client ? `_${data.client.nom.replace(/\s/g, "_")}` : "";
    doc.save(`${data.client ? "Facture" : "Recu"}${suffix}_${data.date}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} opération{filtered.length !== 1 ? "s" : ""} —{" "}
            Total :{" "}
            <span
              className={`font-semibold ${kind === "recettes" ? "text-success" : "text-destructive"}`}
            >
              {fmtMoney(total)}
            </span>
            {hasFilter && (
              <span className="ml-2 text-xs text-muted-foreground">(filtré)</span>
            )}
          </p>
        </div>

        <Dialog
          open={openForm}
          onOpenChange={(o) => {
            setOpenForm(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="shadow-sm" onClick={() => setNextRef(computeNextRef())}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          {/* ✅ key prop force la réinitialisation du formulaire à chaque ouverture/changement */}
          <FormDialog
            key={editing?.id ?? "new"}
            kind={kind}
            editing={editing}
            categories={[...categories]}
            tiersList={tiersList}
            nextRef={nextRef}
            onSubmit={(v) => upsert.mutate({ ...v, id: editing?.id })}
            loading={upsert.isPending}
          />
        </Dialog>
      </div>

      {/* Barre de filtres */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4" /> Filtres & recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Raccourcis période */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Période :</span>
            {[
              { label: "Aujourd'hui", icon: CalendarDays, period: "today" as const },
              { label: "Ce mois", icon: Calendar, period: "thisMonth" as const },
              { label: "Mois dernier", icon: Calendar, period: "lastMonth" as const },
              { label: "Cette année", icon: Calendar, period: "thisYear" as const },
            ].map(({ label, period }) => (
              <button
                key={period}
                onClick={() => applyPeriod(period)}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-accent hover:border-primary/30 transition-colors font-medium text-muted-foreground hover:text-foreground"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Recherche (description, référence, tiers…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36"
                title="Date début"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
                title="Date fin"
              />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-52">
                <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les catégories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Effacer les filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Référence</th>
                  <th className="px-4 py-3 font-medium">Tiers lié</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Paiement</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                  <th className="px-4 py-3 font-medium text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 rounded bg-muted animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.map((row) => {
                      const tierName = (row as Recette).client?.nom || (row as Depense).fournisseur?.nom;
                      return (
                        <tr
                          key={row.id}
                          className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {fmtDate(row.date)}
                          </td>
                          <td className="px-4 py-3">
                            {row.reference ? (
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {row.reference}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {tierName ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary/80">
                                <User className="h-3 w-3" />
                                {tierName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <span className="truncate block">{row.description || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            {row.categorie ? (
                              <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                                {row.categorie}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {row.mode_paiement ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            <span className={kind === "recettes" ? "text-success" : "text-destructive"}>
                              {kind === "recettes" ? "+" : "-"}{fmtMoney(row.montant)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {kind === "recettes" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 mr-1 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => generateInvoice(row as Recette)}
                                title="Générer Facture PDF"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => { setEditing(row); setOpenForm(true); }}
                              title="Modifier"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setConfirmDel(row.id)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                {!query.isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 opacity-30" />
                        <p>Aucune opération trouvée</p>
                        {hasFilter && (
                          <button
                            onClick={clearFilters}
                            className="text-primary text-sm underline underline-offset-2"
                          >
                            Effacer les filtres
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette opération sera définitivement supprimée. Cette action est <strong>irréversible</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDel && remove.mutate(confirmDel)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Formulaire ── */
function FormDialog({
  kind,
  editing,
  categories,
  tiersList,
  nextRef,
  onSubmit,
  loading,
}: {
  kind: Kind;
  editing: Row | null;
  categories: string[];
  tiersList: (Client | Fournisseur)[];
  nextRef?: string;
  onSubmit: (v: {
    date: string;
    montant: number;
    description: string;
    categorie: string;
    mode_paiement: string;
    reference: string;
    tier_id: string;
  }) => void;
  loading: boolean;
}) {
  // ✅ useEffect pour réinitialiser correctement quand editing change
  const [date, setDate]         = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [montant, setMontant]   = useState(editing ? String(editing.montant) : "");
  const [desc, setDesc]         = useState(editing?.description ?? "");
  const [cat, setCat]           = useState(editing?.categorie ?? "");
  const [mode, setMode]         = useState(editing?.mode_paiement ?? "");
  const [ref, setRef]           = useState(editing?.reference ?? nextRef ?? "");

  const initTier = kind === "recettes"
    ? (editing as Recette)?.client_id
    : (editing as Depense)?.fournisseur_id;
  const [tierId, setTierId] = useState(initTier ?? "none");

  useEffect(() => {
    setDate(editing?.date ?? new Date().toISOString().slice(0, 10));
    setMontant(editing ? String(editing.montant) : "");
    setDesc(editing?.description ?? "");
    setCat(editing?.categorie ?? "");
    setMode(editing?.mode_paiement ?? "");
    setRef(editing?.reference ?? nextRef ?? "");
    const t = kind === "recettes"
      ? (editing as Recette)?.client_id
      : (editing as Depense)?.fournisseur_id;
    setTierId(t ?? "none");
  }, [editing, kind, nextRef]);

  // ✅ Validation : montant doit être > 0
  const montantNum = Number(montant);
  const montantInvalid = montant !== "" && (isNaN(montantNum) || montantNum <= 0);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-lg">
          {editing ? "Modifier la transaction" : `Nouvelle ${kind === "recettes" ? "recette" : "dépense"}`}
        </DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (montantNum <= 0) {
            toast.error("Le montant doit être supérieur à 0");
            return;
          }
          onSubmit({ date, montant: montantNum, description: desc, categorie: cat, mode_paiement: mode, reference: ref, tier_id: tierId });
        }}
        className="space-y-4 mt-2"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date *
            </Label>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Montant (FCFA) *
            </Label>
            <Input
              type="number"
              min="1"
              step="1"
              required
              placeholder="0"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className={montantInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {montantInvalid && (
              <p className="text-xs text-destructive">Le montant doit être supérieur à 0</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> {kind === "recettes" ? "Client Lié (Optionnel)" : "Fournisseur Lié (Optionnel)"}
          </Label>
          <Select value={tierId} onValueChange={setTierId}>
            <SelectTrigger>
              <SelectValue placeholder="Aucun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {tiersList.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </Label>
          <Input
            placeholder={kind === "recettes" ? "Ex : Vente de marchandises" : "Ex : Achat fournitures"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> Catégorie
            </Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Mode de paiement
            </Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {MODES_PAIEMENT.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Hash className="h-3 w-3" /> Référence pièce (Facture / Reçu)
          </Label>
          <Input
            placeholder="Ex : FAC-2025-001"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button type="submit" disabled={loading || montantInvalid} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Enregistrement…
              </span>
            ) : editing ? "Modifier la transaction" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
