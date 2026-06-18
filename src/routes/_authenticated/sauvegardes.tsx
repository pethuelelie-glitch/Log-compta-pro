import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRecettes, listDepenses, listClients, listFournisseurs } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, FileSpreadsheet, AlertTriangle, History, CheckCircle } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Switch } from "@/components/ui/switch";
import { APP_NAME, APP_VERSION } from "@/lib/brand";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sauvegardes")({
  component: Sauvegardes,
  ssr: false,
});

type BackupEntry = {
  date: string;
  size: string;
  type: "JSON" | "Excel";
};

function Sauvegardes() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  const recettes     = useQuery({ queryKey: ["recettes"],     queryFn: listRecettes });
  const depenses     = useQuery({ queryKey: ["depenses"],     queryFn: listDepenses });
  const clients      = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const fournisseurs = useQuery({ queryKey: ["fournisseurs"], queryFn: listFournisseurs });

  const counts = {
    recettes:     recettes.data?.length     ?? 0,
    depenses:     depenses.data?.length     ?? 0,
    clients:      clients.data?.length      ?? 0,
    fournisseurs: fournisseurs.data?.length ?? 0,
  };

  const totalProduits = (recettes.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const totalCharges  = (depenses.data ?? []).reduce((s, x) => s + Number(x.montant), 0);

  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem("autoBackup") === "true");
  const [backupHistory, setBackupHistory] = useState<BackupEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("backupHistory") ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("autoBackup", String(autoBackup));
  }, [autoBackup]);

  const addToHistory = (type: "JSON" | "Excel", sizeBytes: number) => {
    const entry: BackupEntry = {
      date: new Date().toISOString(),
      size: sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(1)} Ko` : `${sizeBytes} o`,
      type,
    };
    setBackupHistory((prev) => {
      const next = [entry, ...prev].slice(0, 10); // garder les 10 dernières
      localStorage.setItem("backupHistory", JSON.stringify(next));
      return next;
    });
  };

  // ✅ Fix: exportJSON stabilisée avec useCallback pour éviter le re-render dans useEffect
  const exportJSON = useCallback(() => {
    const data = {
      version: 2,
      exported_at: new Date().toISOString(),
      app: APP_NAME,
      app_version: APP_VERSION,
      tables: {
        recettes: recettes.data ?? [],
        depenses: depenses.data ?? [],
        clients: clients.data ?? [],
        fournisseurs: fournisseurs.data ?? [],
      },
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    download(blob, `${APP_NAME.replace(/\s/g, "_")}_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`);
    addToHistory("JSON", jsonStr.length);
    toast.success("Sauvegarde JSON téléchargée ✓");
  }, [recettes.data, depenses.data, clients.data, fournisseurs.data]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const stripMeta = (rows: Record<string, unknown>[]) =>
      rows.map(({ created_at, updated_at, created_by, ...rest }) => rest);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripMeta(recettes.data ?? [])), "Produits (Recettes)");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripMeta(depenses.data ?? [])), "Charges (Dépenses)");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripMeta(clients.data ?? [])), "Clients");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripMeta(fournisseurs.data ?? [])), "Fournisseurs");

    const compteResultat = [
      { Élément: "Total des produits (recettes)", Montant: totalProduits },
      { Élément: "Total des charges (dépenses)",  Montant: totalCharges },
      { Élément: "Résultat net (bénéfice/perte)", Montant: totalProduits - totalCharges },
      {
        Élément: "Taux de marge (%)",
        Montant: totalProduits > 0 ? +((((totalProduits - totalCharges) / totalProduits) * 100).toFixed(2)) : 0,
      },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compteResultat), "Compte de résultat");

    const fileName = `${APP_NAME.replace(/\s/g, "_")}_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    addToHistory("Excel", 0); // taille inconnue côté JS pour xlsx
    toast.success("Export Excel généré ✓");
  };

  // ✅ Fix: useEffect avec dépendances correctes (exportJSON est stable via useCallback)
  useEffect(() => {
    if (!autoBackup || role !== "admin") return;
    const allLoaded =
      recettes.isSuccess &&
      depenses.isSuccess &&
      clients.isSuccess &&
      fournisseurs.isSuccess;
    if (!allLoaded) return;

    const lastBackup = localStorage.getItem("lastBackupDate");
    const today = new Date().toISOString().slice(0, 10);

    if (lastBackup !== today) {
      exportJSON();
      localStorage.setItem("lastBackupDate", today);
      toast.info("Sauvegarde automatique quotidienne téléchargée.");
    }
  }, [
    autoBackup,
    role,
    recettes.isSuccess,
    depenses.isSuccess,
    clients.isSuccess,
    fournisseurs.isSuccess,
    exportJSON,
  ]);

  const restore = async (file: File) => {
    if (role !== "admin") {
      toast.error("Seuls les administrateurs peuvent restaurer une sauvegarde.");
      return;
    }
    if (
      !confirm(
        "⚠️ Restaurer va ÉCRASER toutes les données actuelles (recettes, dépenses, clients, fournisseurs). Cette action est IRRÉVERSIBLE.\n\nContinuer ?",
      )
    )
      return;

    setRestoring(true);
    try {
      const json = JSON.parse(await file.text());
      const t = json.tables ?? {};
      for (const table of ["recettes", "depenses", "clients", "fournisseurs"] as const) {
        await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        const rows = (t[table] ?? []).map(
          ({ created_at, updated_at, ...rest }: Record<string, unknown>) => rest,
        );
        if (rows.length) {
          const { error } = await supabase.from(table).insert(rows);
          if (error) throw error;
        }
      }
      qc.invalidateQueries();
      toast.success(`Restauration terminée — ${Object.values(t).flat().length} enregistrements chargés`);
    } catch (e: unknown) {
      toast.error(`Erreur de restauration : ${(e as Error).message ?? "Fichier invalide"}`);
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sauvegardes & Exports</h1>
        <p className="text-muted-foreground mt-1">
          Exportez, sauvegardez et restaurez vos données comptables
        </p>
      </div>

      {/* Résumé des données */}
      <div className="grid gap-4 md:grid-cols-4">
        <Mini label="Recettes"     v={counts.recettes}     amount={totalProduits}  tone="success" />
        <Mini label="Dépenses"     v={counts.depenses}     amount={totalCharges}   tone="destructive" />
        <Mini label="Clients"      v={counts.clients}      tone="neutral" />
        <Mini label="Fournisseurs" v={counts.fournisseurs} tone="neutral" />
      </div>

      {/* Sauvegarde automatique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Sauvegarde automatique (locale)
          </CardTitle>
          <CardDescription>
            Si activée, une sauvegarde JSON sera automatiquement téléchargée une fois par jour à
            votre connexion. Réservé aux administrateurs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Switch
            checked={autoBackup}
            onCheckedChange={setAutoBackup}
            disabled={role !== "admin"}
          />
          <div>
            <span className="text-sm font-medium">
              {autoBackup ? "Activée" : "Désactivée"}
            </span>
            {autoBackup && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Dernière sauvegarde auto :{" "}
                {localStorage.getItem("lastBackupDate")
                  ? fmtDate(localStorage.getItem("lastBackupDate")!)
                  : "jamais"}
              </p>
            )}
          </div>
          {role !== "admin" && (
            <span className="text-xs text-muted-foreground">(admin uniquement)</span>
          )}
        </CardContent>
      </Card>

      {/* Exports */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Sauvegarde JSON
            </CardTitle>
            <CardDescription>
              Snapshot complet de la base, restaurable ultérieurement. Inclut toutes les données
              et métadonnées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={exportJSON} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Télécharger la sauvegarde JSON
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {counts.recettes + counts.depenses + counts.clients + counts.fournisseurs} enregistrements au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              Export Excel (.xlsx)
            </CardTitle>
            <CardDescription>
              Classeur multi-onglets : Produits, Charges, Clients, Fournisseurs et Compte de résultat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={exportExcel} variant="secondary" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Exporter en Excel
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Résultat net : <strong className={totalProduits - totalCharges >= 0 ? "text-success" : "text-destructive"}>
                {fmtMoney(totalProduits - totalCharges)}
              </strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historique des sauvegardes */}
      {backupHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Historique des exports (session)
            </CardTitle>
            <CardDescription>
              Les 10 derniers exports effectués dans cette session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backupHistory.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="font-medium">{entry.type}</span>
                    {entry.size && <span className="text-muted-foreground text-xs">({entry.size})</span>}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.date).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restauration */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Zone de restauration
          </CardTitle>
          <CardDescription>
            <strong className="text-destructive">Zone dangereuse</strong> — Réservé aux administrateurs.
            Cette opération <strong>écrase irréversiblement</strong> toutes les données existantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) restore(f);
            }}
          />
          <Button
            variant="destructive"
            disabled={role !== "admin" || restoring}
            onClick={() => fileRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {restoring ? "Restauration en cours…" : "Restaurer depuis un fichier JSON"}
          </Button>
          {role !== "admin" && (
            <p className="text-xs text-muted-foreground">
              Connectez-vous avec un compte administrateur pour accéder à la restauration.
            </p>
          )}
          {role === "admin" && (
            <p className="text-xs text-muted-foreground">
              ⚠️ Faites une sauvegarde JSON avant toute restauration. Les données actuelles seront
              définitivement perdues.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({
  label, v, amount, tone,
}: {
  label: string;
  v: number;
  amount?: number;
  tone: "success" | "destructive" | "neutral";
}) {
  const colors = {
    success:     "text-success",
    destructive: "text-destructive",
    neutral:     "text-primary",
  };
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${colors[tone]}`}>{v}</p>
        {amount !== undefined && (
          <p className={`text-xs mt-0.5 font-medium ${colors[tone]}`}>{fmtMoney(amount)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
