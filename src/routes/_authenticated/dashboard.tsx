import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses, listClients, listFournisseurs } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, fmtDate } from "@/lib/format";
import { ArrowDownCircle, ArrowUpCircle, Users, Truck, Wallet, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard, ssr: false });

function Dashboard() {
  const r = useQuery({ queryKey: ["recettes"], queryFn: listRecettes });
  const d = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });
  const c = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const f = useQuery({ queryKey: ["fournisseurs"], queryFn: listFournisseurs });

  const totalR = (r.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const totalD = (d.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const solde = totalR - totalD;

  const monthly = useMemo(() => {
    const map = new Map<string, { mois: string; recettes: number; depenses: number }>();
    const key = (dt: string) => dt.slice(0, 7);
    for (const x of r.data ?? []) {
      const k = key(x.date);
      const cur = map.get(k) ?? { mois: k, recettes: 0, depenses: 0 };
      cur.recettes += Number(x.montant); map.set(k, cur);
    }
    for (const x of d.data ?? []) {
      const k = key(x.date);
      const cur = map.get(k) ?? { mois: k, recettes: 0, depenses: 0 };
      cur.depenses += Number(x.montant); map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-6);
  }, [r.data, d.data]);

  const recent = [
    ...(r.data ?? []).map(x => ({ ...x, type: "Recette" as const })),
    ...(d.data ?? []).map(x => ({ ...x, type: "Dépense" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={ArrowDownCircle} label="Total Recettes" value={fmtMoney(totalR)} color="text-success" />
        <StatCard icon={ArrowUpCircle} label="Total Dépenses" value={fmtMoney(totalD)} color="text-destructive" />
        <StatCard icon={Wallet} label="Solde Actuel" value={fmtMoney(solde)} color={solde >= 0 ? "text-primary" : "text-destructive"} />
        <StatCard icon={Users} label="Clients" value={String(c.data?.length ?? 0)} color="text-secondary" />
        <StatCard icon={Truck} label="Fournisseurs" value={String(f.data?.length ?? 0)} color="text-secondary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Recettes vs Dépenses (6 mois)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mois" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="recettes" fill="oklch(0.68 0.16 155)" name="Recettes" />
                <Bar dataKey="depenses" fill="oklch(0.62 0.22 25)" name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Évolution du flux</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mois" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Legend />
                <Line type="monotone" dataKey="recettes" stroke="oklch(0.42 0.18 265)" strokeWidth={2} />
                <Line type="monotone" dataKey="depenses" stroke="oklch(0.62 0.22 25)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Dernières opérations</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr><th className="py-2">Date</th><th>Type</th><th>Description</th><th className="text-right">Montant</th></tr>
              </thead>
              <tbody>
                {recent.map(op => (
                  <tr key={`${op.type}-${op.id}`} className="border-b last:border-0">
                    <td className="py-2">{fmtDate(op.date)}</td>
                    <td><span className={op.type === "Recette" ? "text-success font-medium" : "text-destructive font-medium"}>{op.type}</span></td>
                    <td className="text-muted-foreground">{op.description || "—"}</td>
                    <td className="text-right font-medium">{fmtMoney(op.montant)}</td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Aucune opération</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className="rounded-lg bg-accent p-2"><Icon className={`h-5 w-5 ${color}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}
