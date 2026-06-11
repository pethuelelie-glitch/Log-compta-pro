import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRecettes, listDepenses, listClients, listFournisseurs } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/sauvegardes")({ component: Sauvegardes, ssr: false });

function Sauvegardes() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  const recettes = useQuery({ queryKey: ["recettes"], queryFn: listRecettes });
  const depenses = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });
  const clients = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const fournisseurs = useQuery({ queryKey: ["fournisseurs"], queryFn: listFournisseurs });

  const counts = {
    recettes: recettes.data?.length ?? 0,
    depenses: depenses.data?.length ?? 0,
    clients: clients.data?.length ?? 0,
    fournisseurs: fournisseurs.data?.length ?? 0,
  };

  const exportJSON = () => {
    const data = {
      version: 1,
      exported_at: new Date().toISOString(),
      app: "Log Compta Pro",
      tables: {
        recettes: recettes.data ?? [],
        depenses: depenses.data ?? [],
        clients: clients.data ?? [],
        fournisseurs: fournisseurs.data ?? [],
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    download(blob, `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success("Sauvegarde JSON téléchargée");
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const stripDates = (rows: any[]) => rows.map(({ created_at, updated_at, created_by, ...rest }) => rest);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripDates(recettes.data ?? [])), "Recettes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripDates(depenses.data ?? [])), "Dépenses");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripDates(clients.data ?? [])), "Clients");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripDates(fournisseurs.data ?? [])), "Fournisseurs");

    const totalR = (recettes.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
    const totalD = (depenses.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
    const bilan = [
      { Élément: "Total Recettes", Montant: totalR },
      { Élément: "Total Dépenses", Montant: totalD },
      { Élément: "Résultat net", Montant: totalR - totalD },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bilan), "Bilan");

    XLSX.writeFile(wb, `export-comptable-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Export Excel généré");
  };

  const restore = async (file: File) => {
    if (role !== "admin") { toast.error("Seuls les admins peuvent restaurer"); return; }
    if (!confirm("Restaurer remplacera toutes les données comptables (recettes, dépenses, clients, fournisseurs). Continuer ?")) return;
    setRestoring(true);
    try {
      const json = JSON.parse(await file.text());
      const t = json.tables ?? {};
      // Purge then insert
      for (const table of ["recettes", "depenses", "clients", "fournisseurs"] as const) {
        await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        const rows = (t[table] ?? []).map(({ created_at, updated_at, ...rest }: any) => rest);
        if (rows.length) {
          const { error } = await supabase.from(table).insert(rows);
          if (error) throw error;
        }
      }
      qc.invalidateQueries();
      toast.success("Restauration terminée");
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sauvegardes & Exports</h1>
        <p className="text-muted-foreground">Exportez vos données ou restaurez une sauvegarde</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Mini label="Recettes" v={counts.recettes} />
        <Mini label="Dépenses" v={counts.depenses} />
        <Mini label="Clients" v={counts.clients} />
        <Mini label="Fournisseurs" v={counts.fournisseurs} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Sauvegarde JSON</CardTitle>
            <CardDescription>Snapshot complet de la base, restaurable plus tard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportJSON} className="w-full"><Download className="h-4 w-4 mr-2" />Télécharger la sauvegarde</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-success" />Export Excel</CardTitle>
            <CardDescription>Classeur .xlsx avec un onglet par module + bilan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportExcel} variant="secondary" className="w-full"><Download className="h-4 w-4 mr-2" />Exporter en Excel</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Restauration</CardTitle>
          <CardDescription>Réservé aux administrateurs. Cette opération <strong>écrase</strong> les données existantes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); }}
          />
          <Button
            variant="destructive"
            disabled={role !== "admin" || restoring}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />{restoring ? "Restauration…" : "Restaurer un fichier JSON"}
          </Button>
          {role !== "admin" && <p className="text-xs text-muted-foreground">Connectez-vous avec un compte administrateur pour restaurer.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold">{v}</p>
    </CardContent></Card>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
