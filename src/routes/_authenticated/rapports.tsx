import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRecettes, listDepenses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney, fmtDate } from "@/lib/format";
import { APP_NAME, APP_VERSION } from "@/lib/brand";
import {
  FileDown, Printer, CalendarRange, TrendingUp, TrendingDown, Scale,
  Calendar, CalendarDays,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Logo } from "@/components/Logo";
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

  /* ── Raccourcis de période ── */
  const applyPeriod = (period: "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear") => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (period === "thisMonth") {
      setDateFrom(`${today.slice(0, 7)}-01`);
      setDateTo(today);
    } else if (period === "lastMonth") {
      const lm  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(lm.toISOString().slice(0, 10));
      setDateTo(lme.toISOString().slice(0, 10));
    } else if (period === "thisQuarter") {
      const q = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), q * 3, 1);
      setDateFrom(qStart.toISOString().slice(0, 10));
      setDateTo(today);
    } else if (period === "thisYear") {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(today);
    }
  };

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

  // ✅ Fix : éviter NaN quand totalProduits = 0, retourner null pour signaler "non applicable"
  const tauxMargeNum: number | null = totalProduits > 0
    ? (resultat / totalProduits) * 100
    : null;
  const tauxMargeLabel = tauxMargeNum !== null ? `${tauxMargeNum.toFixed(1)} %` : "—";
  const tauxMargePositif = tauxMargeNum === null ? true : tauxMargeNum >= 0;

  /* Journal chronologique */
  const journal = [
    ...recettes.map((x) => ({
      id: x.id, date: x.date, type: "Produit", description: x.description,
      categorie: x.categorie, reference: x.reference, montant: Number(x.montant),
      tier: x.client?.nom ?? null,
    })),
    ...depenses.map((x) => ({
      id: x.id, date: x.date, type: "Charge", description: x.description,
      categorie: x.categorie, reference: x.reference, montant: -Number(x.montant),
      tier: x.fournisseur?.nom ?? null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  /* Résumé par catégorie — Recettes */
  const catRecettes = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of recettes) {
      const k = x.categorie ?? "Non classé";
      map.set(k, (map.get(k) ?? 0) + Number(x.montant));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total, pct: totalProduits > 0 ? (total / totalProduits) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [recettes, totalProduits]);

  /* Résumé par catégorie — Dépenses */
  const catDepenses = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of depenses) {
      const k = x.categorie ?? "Non classé";
      map.set(k, (map.get(k) ?? 0) + Number(x.montant));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total, pct: totalCharges > 0 ? (total / totalCharges) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [depenses, totalCharges]);

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

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 6, 12, 12, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text("CV", 20, 14, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(APP_NAME, 30, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Rapport comptable — v" + APP_VERSION, 14, 24);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 85, 24);
    doc.text(dateLabel, 160, 24, { align: "center" });

    /* Compte de résultat */
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
          "Taux de marge nette",
          {
            content: tauxMargeLabel,
            styles: { textColor: tauxMargePositif ? [22, 163, 74] : [220, 38, 38] },
          },
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
      head: [["Date", "Réf.", "Type", "Tier", "Description", "Catégorie", "Montant"]],
      body: journal.map((j) => [
        fmtDate(j.date),
        j.reference ?? "—",
        j.type,
        j.tier ?? "—",
        j.description || "—",
        j.categorie ?? "—",
        fmtMoney(Math.abs(j.montant)),
      ]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 6: { halign: "right" } },
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
      {/* En-tête impression seulement */}
      <div className="hidden print:flex items-center justify-between border-b pb-6 mb-6">
        <Logo size="lg" showText={true} />
        <div className="text-right text-sm text-muted-foreground">
          <p>Rapport généré le {new Date().toLocaleDateString("fr-FR")}</p>
          <p>Version {APP_VERSION}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports comptables</h1>
          <p className="text-muted-foreground mt-1">
            Journal, compte de résultat et analyses par catégorie
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
        <CardContent className="py-4 space-y-3">
          {/* Raccourcis */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Raccourcis :</span>
            {[
              { label: "Ce mois", period: "thisMonth" as const, icon: CalendarDays },
              { label: "Mois dernier", period: "lastMonth" as const, icon: Calendar },
              { label: "Ce trimestre", period: "thisQuarter" as const, icon: CalendarRange },
              { label: "Cette année", period: "thisYear" as const, icon: Calendar },
            ].map(({ label, period }) => (
              <button
                key={period}
                onClick={() => applyPeriod(period)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-medium text-muted-foreground"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Dates manuelles */}
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
        <Stat icon={TrendingUp}   label="Total des produits" value={fmtMoney(totalProduits)} color="text-success"     bg="bg-success/8" />
        <Stat icon={TrendingDown} label="Total des charges"  value={fmtMoney(totalCharges)}  color="text-destructive" bg="bg-destructive/8" />
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
          value={tauxMargeLabel}
          color={tauxMargePositif ? "text-success" : "text-destructive"}
          bg={tauxMargePositif ? "bg-success/8" : "bg-destructive/8"}
        />
      </div>

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
                  + {fmtMoney(totalProduits)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-muted-foreground font-medium">
                  Charges (dépenses décaissées)
                </td>
                <td className="text-right font-semibold text-destructive text-base">
                  − {fmtMoney(totalCharges)}
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
                <td className={`text-right font-bold ${tauxMargePositif ? "text-success" : "text-destructive"}`}>
                  {tauxMargeLabel}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground italic">
            ※ Ce compte de résultat est établi selon la méthode des encaissements/décaissements (comptabilité de caisse).
          </p>
        </CardContent>
      </Card>

      {/* Répartition par catégorie */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Produits par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-success" />
              Produits par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {catRecettes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {catRecettes.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate max-w-[180px]">{cat.name}</span>
                      <span className="text-success font-semibold shrink-0 ml-2">{fmtMoney(cat.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all duration-500"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.pct.toFixed(1)} % du total</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charges par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Charges par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {catDepenses.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {catDepenses.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate max-w-[180px]">{cat.name}</span>
                      <span className="text-destructive font-semibold shrink-0 ml-2">{fmtMoney(cat.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive transition-all duration-500"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.pct.toFixed(1)} % du total</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
                  <th className="px-3 py-2.5 font-medium">Tier (Client/Fourn.)</th>
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
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[150px] truncate">
                      {j.tier ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {j.description || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {j.categorie ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      <span className={j.type === "Produit" ? "text-success" : "text-destructive"}>
                        {j.type === "Produit" ? "+" : "−"}{fmtMoney(Math.abs(j.montant))}
                      </span>
                    </td>
                  </tr>
                ))}
                {journal.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Aucune écriture dans la période sélectionnée
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

function Stat({
  icon: Icon, label, value, color, bg,
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
