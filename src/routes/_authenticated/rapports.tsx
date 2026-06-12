import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney, fmtDate } from "@/lib/format";
import { APP_NAME, APP_VERSION } from "@/lib/brand";
import { FileDown, Printer, CalendarRange, TrendingUp, TrendingDown, Scale } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/rapports")({
  component: Rapports,
  ssr: false,
});

function Rapports() {
  const r = useQuery({ queryKey: ["recettes"], queryFn: listRecettes });
  const d = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const recettes = useMemo(() => {
    const all = r.data ?? [];
    return all.filter((x) => {
      const okFrom = !dateFrom || x.date >= dateFrom;
      const okTo   = !dateTo   || x.date <= dateTo;
      return okFrom && okTo;
    });
  }, [r.data, dateFrom, dateTo]);

  const depenses = useMemo(() => {
    const all = d.data ?? [];
    return all.filter((x) => {
      const okFrom = !dateFrom || x.date >= dateFrom;
      const okTo   = !dateTo   || x.date <= dateTo;
      return okFrom && okTo;
    });
  }, [d.data, dateFrom, dateTo]);

  const totalProduits = recettes.reduce((s, x) => s + Number(x.montant), 0);
  const totalCharges  = depenses.reduce((s, x) => s + Number(x.montant), 0);
  const resultat      = totalProduits - totalCharges;
  const tauxMarge     = totalProduits > 0 ? ((resultat / totalProduits) * 100).toFixed(1) : "—";

  /* Journal chronologique */
  const journal = [
    ...recettes.map((x) => ({
      id: x.id, date: x.date, type: "Produit", description: x.description,
      categorie: x.categorie, reference: x.reference, montant: Number(x.montant),
    })),
    ...depenses.map((x) => ({
      id: x.id, date: x.date, type: "Charge", description: x.description,
      categorie: x.categorie, reference: x.reference, montant: -Number(x.montant),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  /* ── Export PDF ── */
  const exportPDF = () => {
    const doc = new jsPDF();
    const dateLabel =
      dateFrom && dateTo
        ? `Du ${fmtDate(dateFrom)} au ${fmtDate(dateTo)}`
        : dateFrom
        ? `Depuis le ${fmtDate(dateFrom)}`
        : dateTo
        ? `Jusqu'au ${fmtDate(dateTo)}`
        : "Toutes périodes";

    /* En-tête */
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 28, "F");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(APP_NAME, 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Rapport comptable — v" + APP_VERSION, 14, 18);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 23);
    doc.text(dateLabel, 120, 18);

    /* Compte de résultat synthèse */
    let y = 36;
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text("Compte de résultat", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Élément", "Montant"]],
      body: [
        ["Total des produits (recettes)", fmtMoney(totalProduits)],
        ["Total des charges (dépenses)",  fmtMoney(totalCharges)],
        [
          { content: "Résultat net (bénéfice / perte)", styles: { fontStyle: "bold" } },
          {
            content: fmtMoney(resultat),
            styles: {
              fontStyle: "bold",
              textColor: resultat >= 0 ? [22, 163, 74] : [220, 38, 38],
            },
          },
        ],
        [
          "Taux de marge",
          { content: `${tauxMarge} %`, styles: { textColor: Number(tauxMarge) >= 0 ? [22, 163, 74] : [220, 38, 38] } },
        ],
      ],
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 255] },
    });

    /* Journal comptable */
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text("Journal comptable", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Date", "Réf.", "Type", "Description", "Catégorie", "Montant"]],
      body: journal.map((j) => [
        fmtDate(j.date),
        j.reference ?? "—",
        j.type,
        j.description || "—",
        j.categorie ?? "—",
        fmtMoney(Math.abs(j.montant)),
      ]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 5: { halign: "right" } },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          if (data.cell.text[0] === "Produit") {
            data.cell.styles.textColor = [22, 163, 74];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
    });

    doc.save(`${APP_NAME.replace(/\s/g, "_")}_rapport_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports comptables</h1>
          <p className="text-muted-foreground mt-1">
            Journal, compte de résultat et analyses
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button onClick={exportPDF} className="shadow-sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Filtre période */}
      <Card className="print:hidden">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground shrink-0">Période :</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 h-8 text-sm"
                title="Date début"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 h-8 text-sm"
                title="Date fin"
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="h-8 text-xs"
                >
                  Tout afficher
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground ml-auto">
              {journal.length} écriture{journal.length !== 1 ? "s" : ""} dans la période
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI résumé */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          icon={TrendingUp}
          label="Total des produits"
          value={fmtMoney(totalProduits)}
          color="text-success"
          bg="bg-success/8"
        />
        <Stat
          icon={TrendingDown}
          label="Total des charges"
          value={fmtMoney(totalCharges)}
          color="text-destructive"
          bg="bg-destructive/8"
        />
        <Stat
          icon={Scale}
          label="Résultat net"
          value={fmtMoney(resultat)}
          color={resultat >= 0 ? "text-success" : "text-destructive"}
          bg={resultat >= 0 ? "bg-success/8" : "bg-destructive/8"}
        />
        <Stat
          icon={TrendingUp}
          label="Taux de marge"
          value={`${tauxMarge} %`}
          color={Number(tauxMarge) >= 0 ? "text-success" : "text-destructive"}
          bg={Number(tauxMarge) >= 0 ? "bg-success/8" : "bg-destructive/8"}
        />
      </div>

      {/* Journal comptable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal comptable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Réf.</th>
                  <th className="px-3 py-2.5 font-medium">Nature</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Catégorie</th>
                  <th className="px-3 py-2.5 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((j) => (
                  <tr
                    key={`${j.type}-${j.id}`}
                    className="border-b last:border-0 hover:bg-accent/20 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {fmtDate(j.date)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {j.reference ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          j.type === "Produit"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {j.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {j.description || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {j.categorie ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      <span className={j.type === "Produit" ? "text-success" : "text-destructive"}>
                        {j.type === "Produit" ? "+" : "-"}{fmtMoney(Math.abs(j.montant))}
                      </span>
                    </td>
                  </tr>
                ))}
                {journal.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      Aucune écriture dans la période sélectionnée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compte de résultat */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Compte de résultat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-3 text-muted-foreground font-medium">
                  Produits (recettes encaissées)
                </td>
                <td className="text-right font-semibold text-success text-base">
                  {fmtMoney(totalProduits)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-muted-foreground font-medium">
                  Charges (dépenses décaissées)
                </td>
                <td className="text-right font-semibold text-destructive text-base">
                  {fmtMoney(totalCharges)}
                </td>
              </tr>
              <tr className="border-b bg-muted/20">
                <td className="py-3 font-bold">Résultat net (bénéfice / perte)</td>
                <td
                  className={`text-right font-bold text-xl ${
                    resultat >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {resultat >= 0 ? "+" : ""}{fmtMoney(resultat)}
                </td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Taux de marge nette</td>
                <td className={`text-right font-bold ${Number(tauxMarge) >= 0 ? "text-success" : "text-destructive"}`}>
                  {tauxMarge} %
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground italic">
            ※ Ce compte de résultat est établi selon la méthode des encaissements/décaissements (comptabilité de caisse).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg?: string;
}) {
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2.5 ${bg ?? "bg-muted"} shrink-0`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              {label}
            </p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
