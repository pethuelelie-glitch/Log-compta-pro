export const fmtMoney = (n: number | string) => {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

  // Remplace l'espace insécable de la locale française et normalise l'unité en FCFA
  return formatted.replace(/\u202f|\s/g, ".").replace(".FCFA", " FCFA").replace(".XAF", " FCFA");
};

/**
 * Formate une date string ISO (YYYY-MM-DD) sans décalage de fuseau horaire.
 * new Date("2025-01-15") est interprété en UTC → affiché 14/01 en UTC+1.
 * On force midi local pour éviter ce décalage.
 */
export const fmtDate = (d: string | Date) => {
  if (typeof d === "string") {
    // "YYYY-MM-DD" → ajouter T12:00:00 pour éviter le décalage UTC
    const normalized = d.length === 10 ? `${d}T12:00:00` : d;
    return new Date(normalized).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/**
 * Formate un mois "YYYY-MM" en texte lisible, ex: "Juin 2026"
 */
export const fmtMonth = (ym: string): string => {
  // ym = "2026-06"
  const [year, month] = ym.split("-").map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

/**
 * Formate un mois "YYYY-MM" en abrégé, ex: "juin 26"
 */
export const fmtMonthShort = (ym: string): string => {
  const [year, month] = ym.split("-").map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
};
