export const fmtMoney = (n: number | string) => {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
  
  // Remplace l'espace insécable de la locale française par un point, et garde FCFA (ou XAF)
  return formatted.replace(/\u202f|\s/g, ".").replace(".FCFA", " FCFA").replace(".XAF", " FCFA");
};

export const fmtDate = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
