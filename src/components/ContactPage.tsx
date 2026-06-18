import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listClients, listFournisseurs, listRecettes, listDepenses, type Client } from "@/lib/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Mail, Phone, MapPin, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

type Kind = "clients" | "fournisseurs";

export function ContactPage({ kind, title }: { kind: Kind; title: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [kind],
    queryFn: kind === "clients" ? listClients : listFournisseurs,
  });
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  // Charger recettes/dépenses pour afficher le CA / volume par tiers
  const recettesQ = useQuery({ queryKey: ["recettes"], queryFn: listRecettes, enabled: kind === "clients" });
  const depensesQ = useQuery({ queryKey: ["depenses"], queryFn: listDepenses, enabled: kind === "fournisseurs" });

  // Calcul CA par client ou volume par fournisseur
  const volumeByTier = new Map<string, number>();
  if (kind === "clients") {
    for (const rec of recettesQ.data ?? []) {
      if (rec.client_id) {
        volumeByTier.set(rec.client_id, (volumeByTier.get(rec.client_id) ?? 0) + Number(rec.montant));
      }
    }
  } else {
    for (const dep of depensesQ.data ?? []) {
      if (dep.fournisseur_id) {
        volumeByTier.set(dep.fournisseur_id, (volumeByTier.get(dep.fournisseur_id) ?? 0) + Number(dep.montant));
      }
    }
  }

  const filtered = (query.data ?? []).filter((c) =>
    [c.nom, c.email, c.telephone, c.adresse].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  // Trier par volume décroissant pour montrer les plus importants en premier
  const sorted = [...filtered].sort((a, b) =>
    (volumeByTier.get(b.id) ?? 0) - (volumeByTier.get(a.id) ?? 0),
  );

  const upsert = useMutation({
    mutationFn: async (p: {
      id?: string;
      nom: string;
      telephone: string;
      adresse: string;
      email: string;
    }) => {
      const data = {
        nom: p.nom,
        telephone: p.telephone || null,
        adresse: p.adresse || null,
        email: p.email || null,
      };
      if (p.id) {
        const { error } = await supabase.from(kind).update(data).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(kind).insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind] });
      const label = kind === "clients" ? "Client" : "Fournisseur";
      toast.success(editing ? `${label} modifié avec succès ✓` : `${label} ajouté avec succès ✓`);
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
      const label = kind === "clients" ? "Client" : "Fournisseur";
      toast.success(`${label} supprimé`);
      setConfirmDel(null);
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const totalVolume = Array.from(volumeByTier.values()).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            {query.data?.length ?? 0} enregistré(s)
            {totalVolume > 0 && (
              <span className="ml-2">
                · Volume total :{" "}
                <span className={`font-semibold ${kind === "clients" ? "text-success" : "text-destructive"}`}>
                  {fmtMoney(totalVolume)}
                </span>
              </span>
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
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <FormDialog
            key={editing?.id ?? "new"}
            kind={kind}
            editing={editing}
            onSubmit={(v) => upsert.mutate({ ...v, id: editing?.id })}
            loading={upsert.isPending}
          />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, téléphone, adresse…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-8 text-xs">
                Effacer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {sorted.map((c) => {
                const vol = volumeByTier.get(c.id);
                return (
                  <Card key={c.id} className="hover:shadow-md transition-all duration-200 card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          {/* Initiale avatar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                              {c.nom.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="font-semibold truncate">{c.nom}</h3>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {c.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            )}
                            {c.telephone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 shrink-0" />
                                {c.telephone}
                              </div>
                            )}
                            {c.adresse && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{c.adresse}</span>
                              </div>
                            )}
                          </div>
                          {/* CA / Volume */}
                          {vol !== undefined && vol > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs">
                              <TrendingUp className={`h-3 w-3 ${kind === "clients" ? "text-success" : "text-destructive"}`} />
                              <span className={`font-semibold ${kind === "clients" ? "text-success" : "text-destructive"}`}>
                                {fmtMoney(vol)}
                              </span>
                              <span className="text-muted-foreground">
                                {kind === "clients" ? "de CA" : "d'achats"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditing(c);
                              setOpenForm(true);
                            }}
                            title="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setConfirmDel(c.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {sorted.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-10">
                  {search ? "Aucun résultat pour cette recherche" : "Aucun enregistrement"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Le {kind === "clients" ? "client" : "fournisseur"} sera
              définitivement supprimé. Les transactions associées resteront mais sans lien vers ce tiers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDel && remove.mutate(confirmDel)}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormDialog({
  kind,
  editing,
  onSubmit,
  loading,
}: {
  kind: Kind;
  editing: Client | null;
  onSubmit: (v: { nom: string; telephone: string; adresse: string; email: string }) => void;
  loading: boolean;
}) {
  const [nom, setNom]         = useState(editing?.nom ?? "");
  const [telephone, setTel]   = useState(editing?.telephone ?? "");
  const [adresse, setAdr]     = useState(editing?.adresse ?? "");
  const [email, setEmail]     = useState(editing?.email ?? "");

  const label = kind === "clients" ? "client" : "fournisseur";

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {editing ? `Modifier le ${label}` : `Ajouter un ${label}`}
        </DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ nom, telephone, adresse, email });
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nom *
          </Label>
          <Input
            required
            placeholder={`Nom du ${label}`}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Téléphone
            </Label>
            <Input
              placeholder="+225 XX XX XX XX"
              value={telephone ?? ""}
              onChange={(e) => setTel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              placeholder="contact@example.com"
              value={email ?? ""}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Adresse
          </Label>
          <Input
            placeholder="Ville, Quartier, Pays"
            value={adresse ?? ""}
            onChange={(e) => setAdr(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Enregistrement…
              </span>
            ) : editing ? "Modifier" : "Ajouter"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
