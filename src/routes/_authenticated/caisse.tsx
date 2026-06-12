import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, fmtDate } from "@/lib/format";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, CalendarDays,
  AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/caisse")({
  component: Caisse,
  ssr: false,
});

function Caisse() {
  const r = useQuery({ queryKey: ["recettes"], queryFn: listRecettes });
  const d = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });

  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const totalR = (r.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const totalD = (d.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const solde  = totalR - totalD;

  const rToday   = (r.data ?? []).filter((x) => x.date === today)
    .reduce((s, x) => s + Number(x.montant), 0);
  const dToday   = (d.data ?? []).filter((x) => x.date === today)
    .reduce((s, x) => s + Number(x.montant), 0);
  const rMonth   = (r.data ?? []).filter((x) => x.date.startsWith(thisMonth))
    .reduce((s, x) => s + Number(x.montant), 0);
  const dMonth   = (d.data ?? []).filter((x) => x.date.startsWith(thisMonth))
    .reduce((s, x) => s + Number(x.montant), 0);
  const netMois  = rMonth - dMonth;

  /* Mouvements du jour (recettes + dépenses) */
  const mouvementsJour = [
    ...(r.data ?? []).filter((x) => x.date === today).map((x) => ({ ...x, type: "recette" as const })),
    ...(d.data ?? []).filter((x) => x.date === today).map((x) => ({ ...x, type: "depense" as const })),
  ].sort((a, b) => (b.id > a.id ? 1 : -1));

  const isNegative = solde < 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trésorerie</h1>
        <p className="text-muted-foreground mt-1">Solde et flux de liquidités</p>
      </div>

      {/* Alerte solde négatif */}
      {isNegative && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">Solde de trésorerie négatif</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Votre trésorerie est déficitaire de {fmtMoney(Math.abs(solde))}.
              Prenez les mesures nécessaires pour rétablir l'équilibre financier.
            </p>
          </div>
        </div>
      )}

      {/* Carte solde principal */}
      <Card
        className="overflow-hidden"
        style={{
          background: isNegative
            ? "linear-gradient(135deg, oklch(0.40 0.18 22), oklch(0.55 0.20 22))"
            : "linear-gradient(135deg, oklch(0.44 0.22 270), oklch(0.56 0.20 278))",
        }}
      >
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-white/80" />
            <p className="text-sm uppercase tracking-widest text-white/80 font-semibold">
              Solde de trésorerie
            </p>
          </div>
          <p className="mt-4 text-5xl font-bold text-white tracking-tight">
            {fmtMoney(solde)}
          </p>
          <p className="mt-2 text-sm text-white/60">
            Produits encaissés − Charges décaissées (total cumulé)
          </p>
        </CardContent>
      </Card>

      {/* Indicateurs du jour et du mois */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Box icon={ArrowDownCircle} label="Recettes du jour"  value={fmtMoney(rToday)} tone="success" />
        <Box icon={ArrowUpCircle}   label="Dépenses du jour"  value={fmtMoney(dToday)} tone="destructive" />
        <Box icon={CalendarDays}    label="Recettes du mois"  value={fmtMoney(rMonth)} tone="success" />
        <Box icon={CalendarDays}    label="Dépenses du mois"  value={fmtMoney(dMonth)} tone="destructive" />
      </div>

      {/* Flux net mensuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {netMois >= 0
              ? <TrendingUp className="h-4 w-4 text-success" />
              : <TrendingDown className="h-4 w-4 text-destructive" />}
            Flux net du mois en cours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-bold ${netMois >= 0 ? "text-success" : "text-destructive"}`}>
              {netMois >= 0 ? "+" : ""}{fmtMoney(netMois)}
            </span>
            <span className="text-sm text-muted-foreground">ce mois-ci</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Recettes du mois ({fmtMoney(rMonth)}) − Dépenses du mois ({fmtMoney(dMonth)})
          </p>
        </CardContent>
      </Card>

      {/* Mouvements du jour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Mouvements d'aujourd'hui
            {mouvementsJour.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5">
                {mouvementsJour.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mouvementsJour.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Aucun mouvement enregistré aujourd'hui
            </p>
          ) : (
            <div className="space-y-2">
              {mouvementsJour.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        m.type === "recette" ? "bg-success/15" : "bg-destructive/15"
                      }`}
                    >
                      {m.type === "recette"
                        ? <ArrowDownCircle className="h-4 w-4 text-success" />
                        : <ArrowUpCircle   className="h-4 w-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.description || "Sans description"}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.type === "recette" ? "Produit" : "Charge"}
                        {(m as { categorie?: string | null }).categorie
                          ? ` · ${(m as { categorie?: string | null }).categorie}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      m.type === "recette" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {m.type === "recette" ? "+" : "-"}{fmtMoney(m.montant)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Box({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "success" | "destructive";
}) {
  const color = tone === "success" ? "text-success" : "text-destructive";
  const bg    = tone === "success" ? "bg-success/10" : "bg-destructive/10";
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              {label}
            </p>
            <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
