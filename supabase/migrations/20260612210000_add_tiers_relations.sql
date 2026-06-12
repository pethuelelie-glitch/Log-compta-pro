-- Migration: Lier les transactions aux tiers (Clients et Fournisseurs)

-- Ajout de la clé étrangère client_id à la table recettes
ALTER TABLE public.recettes
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.recettes.client_id IS 'Client lié à cette recette (facturation)';

-- Ajout de la clé étrangère fournisseur_id à la table depenses
ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS fournisseur_id UUID REFERENCES public.fournisseurs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.depenses.fournisseur_id IS 'Fournisseur lié à cette dépense (facture achat)';
