import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDate } from "@/lib/format";
import { FileDown, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/rapports")({ component: Rapports, ssr: false });

function Rapports() {
  const r = useQuery({ queryKey: ["recettes"], queryFn: listRecettes });
  const d = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });

  const recettes = r.data ?? [];
  const depenses = d.data ?? [];
  const totalR = recettes.reduce((s, x) => s + Number(x.montant), 0);
  const totalD = depenses.reduce((s, x) => s + Number(x.montant), 0);
  const resultat = totalR - totalD;

  const journal = [
    ...recettes.map(x => ({ id: x.id, date: x.date, type: "Recette", description: x.description, montant: Number(x.montant) })),
    ...depenses.map(x => ({ id: x.id, date: x.date, type: "Dépense", description: x.description, montant: -Number(x.montant) })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(30, 64, 175);
    doc.text("LOG COMPTA PRO", 14, 18);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Rapport généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 24);

    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("Journal Comptable", 14, 34);
    autoTable(doc, {
      startY: 38,
      head: [["Date", "Type", "Description", "Montant"]],
      body: journal.map(j => [fmtDate(j.date), j.type, j.description || "—", fmtMoney(Math.abs(j.montant))]),
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14); doc.text("Bilan Simplifié", 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Élément", "Montant"]],
      body: [
        ["Total Recettes", fmtMoney(totalR)],
        ["Total Dépenses", fmtMoney(totalD)],
        [{ content: "Résultat (bénéfice/perte)", styles: { fontStyle: "bold" } }, { content: fmtMoney(resultat), styles: { fontStyle: "bold", textColor: resultat >= 0 ? [16, 122, 87] : [239, 68, 68] } }],
      ],
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`rapport-comptable-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Rapports comptables</h1>
          <p className="text-muted-foreground">Journal, états et bilan</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF}><FileDown className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total Recettes" value={fmtMoney(totalR)} color="text-success" />
        <Stat label="Total Dépenses" value={fmtMoney(totalD)} color="text-destructive" />
        <Stat label="Résultat" value={fmtMoney(resultat)} color={resultat >= 0 ? "text-success" : "text-destructive"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Journal Comptable</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr><th className="py-2">Date</th><th>Type</th><th>Description</th><th className="text-right">Montant</th></tr>
              </thead>
              <tbody>
                {journal.map(j => (
                  <tr key={`${j.type}-${j.id}`} className="border-b last:border-0">
                    <td className="py-2">{fmtDate(j.date)}</td>
                    <td><span className={j.type === "Recette" ? "text-success font-medium" : "text-destructive font-medium"}>{j.type}</span></td>
                    <td className="text-muted-foreground">{j.description || "—"}</td>
                    <td className="text-right font-medium">{fmtMoney(Math.abs(j.montant))}</td>
                  </tr>
                ))}
                {journal.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Aucune écriture</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bilan simplifié</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-3 text-muted-foreground">Total Recettes (Actif)</td><td className="text-right font-medium text-success">{fmtMoney(totalR)}</td></tr>
              <tr className="border-b"><td className="py-3 text-muted-foreground">Total Dépenses (Passif)</td><td className="text-right font-medium text-destructive">{fmtMoney(totalD)}</td></tr>
              <tr><td className="py-3 font-bold">Résultat net</td><td className={`text-right font-bold text-lg ${resultat >= 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(resultat)}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </CardContent></Card>
  );
}
