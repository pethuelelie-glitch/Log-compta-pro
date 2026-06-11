import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import { Wallet, ArrowDownCircle, ArrowUpCircle, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/caisse")({ component: Caisse, ssr: false });

function Caisse() {
  const r = useQuery({ queryKey: ["recettes"], queryFn: listRecettes });
  const d = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const totalR = (r.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const totalD = (d.data ?? []).reduce((s, x) => s + Number(x.montant), 0);
  const solde = totalR - totalD;

  const rToday = (r.data ?? []).filter(x => x.date === today).reduce((s, x) => s + Number(x.montant), 0);
  const dToday = (d.data ?? []).filter(x => x.date === today).reduce((s, x) => s + Number(x.montant), 0);
  const rMonth = (r.data ?? []).filter(x => x.date.startsWith(thisMonth)).reduce((s, x) => s + Number(x.montant), 0);
  const dMonth = (d.data ?? []).filter(x => x.date.startsWith(thisMonth)).reduce((s, x) => s + Number(x.montant), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Caisse</h1>
        <p className="text-muted-foreground">Solde et flux de trésorerie</p>
      </div>

      <Card className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6" />
            <p className="text-sm uppercase tracking-wide opacity-90">Solde actuel</p>
          </div>
          <p className="mt-3 text-5xl font-bold">{fmtMoney(solde)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Box icon={ArrowDownCircle} label="Recettes du jour" value={fmtMoney(rToday)} tone="success" />
        <Box icon={ArrowUpCircle} label="Dépenses du jour" value={fmtMoney(dToday)} tone="destructive" />
        <Box icon={CalendarDays} label="Recettes du mois" value={fmtMoney(rMonth)} tone="success" />
        <Box icon={CalendarDays} label="Dépenses du mois" value={fmtMoney(dMonth)} tone="destructive" />
      </div>

      <Card>
        <CardHeader><CardTitle>Flux mensuel net</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${(rMonth - dMonth) >= 0 ? "text-success" : "text-destructive"}`}>
              {fmtMoney(rMonth - dMonth)}
            </span>
            <span className="text-sm text-muted-foreground">ce mois-ci</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Box({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "success" | "destructive" }) {
  const color = tone === "success" ? "text-success" : "text-destructive";
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
          <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </CardContent></Card>
  );
}
