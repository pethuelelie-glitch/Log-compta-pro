import { supabase } from "@/integrations/supabase/client";

export type Recette = { id: string; date: string; montant: number; description: string };
export type Depense = { id: string; date: string; montant: number; description: string };
export type Client = { id: string; nom: string; telephone: string | null; adresse: string | null; email: string | null };
export type Fournisseur = Client;

export async function listRecettes(): Promise<Recette[]> {
  const { data, error } = await supabase.from("recettes").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}
export async function listDepenses(): Promise<Depense[]> {
  const { data, error } = await supabase.from("depenses").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}
export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("nom");
  if (error) throw error;
  return (data ?? []) as any;
}
export async function listFournisseurs(): Promise<Fournisseur[]> {
  const { data, error } = await supabase.from("fournisseurs").select("*").order("nom");
  if (error) throw error;
  return (data ?? []) as any;
}
