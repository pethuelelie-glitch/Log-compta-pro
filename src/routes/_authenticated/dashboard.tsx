import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses, listClients, listFournisseurs } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, fmtDate } from "@/lib/format";
import {
  ArrowDownCircle, ArrowUpCircle, Users, Truck, Wallet,
  TrendingUp, TrendingDown, BarChart3, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell, Tooltip as RechTooltip,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  ssr: false,
});

const PIE_COLORS = [
  "#4F46E5", "#7C3AED", "#F59E0B", "#EF4444",
  "#10B981", "#3B82F6", "#8B5CF6", "#F97316",
];

function Dashboard() {
  const r = useQuery({ queryKey: ["recettes"],     queryFn: listRecettes });
  const d = useQuery({ queryKey: ["depenses"],     queryFn: listDepenses });
  const c = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const f = useQuery({ queryKey: ["fournisseurs"], queryFn: listFournisseurs });

  const today      = new Date().toISOString().slice(0, 10);
  const thisMonth  = today.slice(0, 7);
  const prevMonth  = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const totalR = (r.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const totalD = (d.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const solde  = totalR - totalD;
  const tauxMarge = totalR > 0 ? ((solde / totalR) * 100).toFixed(1) : "0.0";

  const rThisMonth = (r.data ?? []).filter((x) => x.date.startsWith(thisMonth)).reduce((s, x) => s + Number(x.montant), 0);
  const dThisMonth = (d.data ?? []).filter((x) => x.date.startsWith(thisMonth)).reduce((s, x) => s + Number(x.montant), 0);
  const rPrevMonth = (r.data ?? []).filter((x) => x.date.startsWith(prevMonth)).reduce((s, x) => s + Number(x.montant), 0);
  const nbTxMonth  = (r.data ?? []).filter((x) => x.date.startsWith(thisMonth)).length
                   + (d.data ?? []).filter((x) => x.date.startsWith(thisMonth)).length;

  const evolutionR = rPrevMonth > 0
    ? (((rThisMonth - rPrevMonth) / rPrevMonth) * 100).toFixed(1)
    : null;

  /* Graphique mensuel 6 mois */
  const monthly = useMemo(() => {
    const map = new Map<string, { mois: string; recettes: number; depenses: number }>();
    const key  = (dt: string) => dt.slice(0, 7);
    for (const x of r.data ?? []) {
      const k = key(x.date);
      const cur = map.get(k) ?? { mois: k, recettes: 0, depenses: 0 };
      cur.recettes += Number(x.montant);
      map.set(k, cur);
    }
    for (const x of d.data ?? []) {
      const k = key(x.date);
      const cur = map.get(k) ?? { mois: k, recettes: 0, depenses: 0 };
      cur.depenses += Number(x.montant);
      map.set(k, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => a.mois.localeCompare(b.mois))
      .slice(-6);
  }, [r.data, d.data]);

  /* Top catégories dépenses pour camembert */
  const topCats = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of d.data ?? []) {
      const cat = x.categorie ?? "Non classé";
      map.set(cat, (map.get(cat) ?? 0) + Number(x.montant));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [d.data]);

  /* Dernières opérations */
  const recent = [
    ...(r.data ?? []).map((x) => ({ ...x, type: "Recette" as const })),
    ...(d.data ?? []).map((x) => ({ ...x, type: "Dépense" as const })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre activité comptable
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard
          icon={ArrowDownCircle}
          label="Total Recettes"
          value={fmtMoney(totalR)}
          sub="Tous les produits"
          color="text-success"
          bg="bg-success/8"
        />
        <StatCard
          icon={ArrowUpCircle}
          label="Total Dépenses"
          value={fmtMoney(totalD)}
          sub="Toutes les charges"
          color="text-destructive"
          bg="bg-destructive/8"
        />
        <StatCard
          icon={Wallet}
          label="Résultat net"
          value={fmtMoney(solde)}
          sub={solde >= 0 ? "Bénéfice" : "Déficit"}
          color={solde >= 0 ? "text-primary" : "text-destructive"}
          bg={solde >= 0 ? "bg-primary/8" : "bg-destructive/8"}
        />
        <StatCard
          icon={solde >= 0 ? TrendingUp : TrendingDown}
          label="Taux de marge"
          value={`${tauxMarge} %`}
          sub="Résultat / Recettes"
          color={Number(tauxMarge) >= 0 ? "text-success" : "text-destructive"}
          bg={Number(tauxMarge) >= 0 ? "bg-success/8" : "bg-destructive/8"}
        />
        <StatCard
          icon={Activity}
          label="Tx ce mois"
          value={String(nbTxMonth)}
          sub={`Recettes : ${fmtMoney(rThisMonth)}`}
          color="text-warning"
          bg="bg-warning/8"
          badge={
            evolutionR !== null
              ? { label: `${Number(evolutionR) >= 0 ? "+" : ""}${evolutionR}% vs mois préc.`, positive: Number(evolutionR) >= 0 }
              : undefined
          }
        />
        <StatCard
          icon={Users}
          label="Clients"
          value={String(c.data?.length ?? 0)}
          sub="Enregistrés"
          color="text-secondary"
          bg="bg-secondary/8"
        />
        <StatCard
          icon={Truck}
          label="Fournisseurs"
          value={String(f.data?.length ?? 0)}
          sub="Enregistrés"
          color="text-secondary"
          bg="bg-secondary/8"
        />
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Barres Recettes vs Dépenses */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Recettes vs Dépenses — 6 derniers mois
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="mois" fontSize={11} tick={{ fill: "oklch(0.50 0.04 262)" }} />
                <YAxis fontSize={11} tick={{ fill: "oklch(0.50 0.04 262)" }} tickFormatter={(v) => fmtMoney(v).replace(/\s/g, "").replace("XAF", "").replace("FCFA", "")} />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtMoney(v), name === "recettes" ? "Produits" : "Charges"]}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend formatter={(v) => v === "recettes" ? "Produits" : "Charges"} />
                <Bar dataKey="recettes" fill="oklch(0.65 0.18 152)" name="recettes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" fill="oklch(0.60 0.22 22)"  name="depenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Camembert dépenses par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Répartition des charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Aucune dépense
              </div>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topCats}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {topCats.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechTooltip
                        formatter={(v: number, name: string) => [fmtMoney(v), name]}
                        contentStyle={{ borderRadius: "8px", fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {topCats.slice(0, 4).map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="font-medium text-destructive">{fmtMoney(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ligne d'évolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution du flux de trésorerie
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="mois" fontSize={11} tick={{ fill: "oklch(0.50 0.04 262)" }} />
              <YAxis fontSize={11} tick={{ fill: "oklch(0.50 0.04 262)" }} />
              <Tooltip
                formatter={(v: number, name: string) => [fmtMoney(v), name === "recettes" ? "Produits" : "Charges"]}
                contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend formatter={(v) => v === "recettes" ? "Produits" : "Charges"} />
              <Line type="monotone" dataKey="recettes" stroke="oklch(0.65 0.18 152)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="depenses" stroke="oklch(0.60 0.22 22)"  strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Dernières opérations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernières opérations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Catégorie</th>
                  <th className="px-3 py-2.5 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((op) => (
                  <tr key={`${op.type}-${op.id}`} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(op.date)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          op.type === "Recette"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {op.type === "Recette" ? "Produit" : "Charge"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{op.description || "—"}</td>
                    <td className="px-3 py-2.5">
                      {op.categorie ? (
                        <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                          {op.categorie}
                        </span>
                      ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      <span className={op.type === "Recette" ? "text-success" : "text-destructive"}>
                        {op.type === "Recette" ? "+" : "-"}{fmtMoney(op.montant)}
                      </span>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      Aucune opération enregistrée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg?: string;
  badge?: { label: string; positive: boolean };
}) {
  return (
    <Card className="overflow-hidden card-hover">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold truncate">
              {label}
            </p>
            <p className={`mt-1.5 text-xl lg:text-2xl font-bold ${color} break-words`}>
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
            )}
            {badge && (
              <span
                className={`inline-flex items-center rounded-full mt-1.5 px-1.5 py-0.5 text-[10px] font-semibold ${
                  badge.positive
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className={`rounded-xl ${bg ?? "bg-muted"} p-2.5 shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
