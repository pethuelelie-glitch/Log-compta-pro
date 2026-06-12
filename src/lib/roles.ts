export type AppRole = "admin" | "comptable";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  comptable: "Comptable",
};

export function roleLabel(role: AppRole | null | undefined): string {
  if (!role) return "Comptable";
  return ROLE_LABELS[role] ?? role;
}
