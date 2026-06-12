import { supabase } from "@/integrations/supabase/client";

export type Recette = {
  id: string;
  date: string;
  montant: number;
  description: string;
  categorie?: string | null;
  mode_paiement?: string | null;
  reference?: string | null;
};

export type Depense = {
  id: string;
  date: string;
  montant: number;
  description: string;
  categorie?: string | null;
  mode_paiement?: string | null;
  reference?: string | null;
};

export type Client = {
  id: string;
  nom: string;
  telephone: string | null;
  adresse: string | null;
  email: string | null;
};

export type Fournisseur = Client;

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "comptable" | null;
};

export async function listRecettes(): Promise<Recette[]> {
  const { data, error } = await supabase
    .from("recettes")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Recette[];
}

export async function listDepenses(): Promise<Depense[]> {
  const { data, error } = await supabase
    .from("depenses")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Depense[];
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("nom");
  if (error) throw error;
  return (data ?? []) as unknown as Client[];
}

export async function listFournisseurs(): Promise<Fournisseur[]> {
  const { data, error } = await supabase.from("fournisseurs").select("*").order("nom");
  if (error) throw error;
  return (data ?? []) as unknown as Fournisseur[];
}

export async function listUsers(): Promise<UserProfile[]> {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .order("email");
  if (pErr) throw pErr;

  const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
  if (rErr) throw rErr;

  return profiles.map((p) => {
    const roleObj = roles.find((r) => r.user_id === p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: roleObj ? roleObj.role : null,
    };
  });
}

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "comptable",
): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });
  if (error) throw error;
}

/* Catégories prédéfinies */
export const CATEGORIES_RECETTES = [
  "Ventes de produits",
  "Prestations de services",
  "Commissions",
  "Subventions",
  "Remboursements",
  "Intérêts reçus",
  "Autre recette",
] as const;

export const CATEGORIES_DEPENSES = [
  "Salaires & charges sociales",
  "Loyer & charges locatives",
  "Fournitures de bureau",
  "Matières premières",
  "Transport & déplacement",
  "Eau & électricité",
  "Taxes & impôts",
  "Frais bancaires",
  "Communication",
  "Maintenance & réparations",
  "Publicité & marketing",
  "Formation",
  "Autre charge",
] as const;

export const MODES_PAIEMENT = [
  "Espèces",
  "Virement bancaire",
  "Chèque",
  "Mobile Money",
  "Carte bancaire",
] as const;
