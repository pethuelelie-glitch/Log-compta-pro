import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, fmtDate, fmtMonthShort } from "@/lib/format";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, CalendarDays,
  AlertTriangle, TrendingUp, TrendingDown, Clock,
} from "lucide-react";
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

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

  const rToday = (r.data ?? []).filter((x) => x.date === today)
    .reduce((s, x) => s + Number(x.montant), 0);
  const dToday = (d.data ?? []).filter((x) => x.date === today)
    .reduce((s, x) => s + Number(x.montant), 0);
  const rMonth = (r.data ?? []).filter((x) => x.date.startsWith(thisMonth))
    .reduce((s, x) => s + Number(x.montant), 0);
  const dMonth = (d.data ?? []).filter((x) => x.date.startsWith(thisMonth))
    .reduce((s, x) => s + Number(x.montant), 0);
  const netMois = rMonth - dMonth;

  /* ── Mouvements du jour ── */
  // ✅ Fix: triés par date desc puis par id desc (UUID non chronologique → on filtre juste le jour)
  const mouvementsJour = [
    ...(r.data ?? []).filter((x) => x.date === today).map((x) => ({ ...x, type: "recette" as const })),
    ...(d.data ?? []).filter((x) => x.date === today).map((x) => ({ ...x, type: "depense" as const })),
  ].sort((a, b) => b.id.localeCompare(a.id));

  /* ── Historique 30 derniers jours ── */
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const mouvements30 = [
    ...(r.data ?? []).filter((x) => x.date >= cutoff && x.date !== today)
      .map((x) => ({ ...x, type: "recette" as const })),
    ...(d.data ?? []).filter((x) => x.date >= cutoff && x.date !== today)
      .map((x) => ({ ...x, type: "depense" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  /* ── Graphique 8 dernières semaines (agrégé par semaine) ── */
  const weeklyChart = useMemo(() => {
    const map = new Map<string, { semaine: string; recettes: number; depenses: number }>();
    const getWeekKey = (dateStr: string) => {
      const dt = new Date(dateStr + "T12:00:00");
      const mon = new Date(dt);
      mon.setDate(dt.getDate() - dt.getDay() + 1); // lundi
      return mon.toISOString().slice(0, 10);
    };
    for (const x of r.data ?? []) {
      const k = getWeekKey(x.date);
      const cur = map.get(k) ?? { semaine: k, recettes: 0, depenses: 0 };
      cur.recettes += Number(x.montant);
      map.set(k, cur);
    }
    for (const x of d.data ?? []) {
      const k = getWeekKey(x.date);
      const cur = map.get(k) ?? { semaine: k, recettes: 0, depenses: 0 };
      cur.depenses += Number(x.montant);
      map.set(k, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => a.semaine.localeCompare(b.semaine))
      .slice(-8)
      .map((w) => ({ ...w, semaine: fmtMonthShort(w.semaine.slice(0, 7)) + " s." + getWeekNum(w.semaine) }));
  }, [r.data, d.data]);

  const isNegative = solde < 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trésorerie</h1>
        <p className="text-muted-foreground mt-1">Solde et flux de liquidités en temps réel</p>
      </div>

      {/* Alerte solde négatif */}
      {isNegative && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">⚠ Solde de trésorerie négatif</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Votre trésorerie est déficitaire de{" "}
              <strong>{fmtMoney(Math.abs(solde))}</strong>.
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
              Solde de trésorerie cumulé
            </p>
          </div>
          <p className="mt-4 text-5xl font-bold text-white tracking-tight">
            {fmtMoney(solde)}
          </p>
          <p className="mt-2 text-sm text-white/60">
            Total produits encaissés ({fmtMoney(totalR)}) − Total charges décaissées ({fmtMoney(totalD)})
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

      {/* Graphique évolution 8 semaines */}
      {weeklyChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution hebdomadaire — 8 dernières semaines
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 152)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 152)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.60 0.22 22)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.60 0.22 22)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="semaine" fontSize={10} tick={{ fill: "oklch(0.50 0.04 262)" }} />
                <YAxis
                  fontSize={10}
                  tick={{ fill: "oklch(0.50 0.04 262)" }}
                  tickFormatter={(v) => fmtMoney(v).replace(/\s/g, "").replace("FCFA", "")}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtMoney(v), name === "recettes" ? "Produits" : "Charges"]}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="recettes" stroke="oklch(0.65 0.18 152)" strokeWidth={2} fill="url(#gradR)" name="recettes" />
                <Area type="monotone" dataKey="depenses" stroke="oklch(0.60 0.22 22)"  strokeWidth={2} fill="url(#gradD)" name="depenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Mouvements d'aujourd'hui */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Mouvements d'aujourd'hui
            {mouvementsJour.length > 0 && (
              <span className="ml-1 inline-flex items-center rounded-full bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5">
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
            <MouvementsListe mouvements={mouvementsJour} />
          )}
        </CardContent>
      </Card>

      {/* Historique 30 jours */}
      {mouvements30.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Historique des 30 derniers jours
              <span className="ml-1 inline-flex items-center rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5">
                {mouvements30.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MouvementsListe mouvements={mouvements30} showDate />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Composant liste de mouvements ── */
function MouvementsListe({
  mouvements,
  showDate = false,
}: {
  mouvements: Array<{
    id: string;
    montant: number;
    description?: string;
    date: string;
    type: "recette" | "depense";
    categorie?: string | null;
  }>;
  showDate?: boolean;
}) {
  return (
    <div className="space-y-2">
      {mouvements.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 hover:bg-muted/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
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
                {m.categorie ? ` · ${m.categorie}` : ""}
                {showDate ? ` · ${fmtDate(m.date)}` : ""}
              </p>
            </div>
          </div>
          <span
            className={`font-semibold shrink-0 ml-4 ${
              m.type === "recette" ? "text-success" : "text-destructive"
            }`}
          >
            {m.type === "recette" ? "+" : "−"}{fmtMoney(m.montant)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Box({
  icon: Icon, label, value, tone,
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

function getWeekNum(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
}
