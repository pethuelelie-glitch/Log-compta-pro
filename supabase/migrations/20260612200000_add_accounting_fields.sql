-- Migration ComptaVision Pro v2.0
-- Ajout des champs comptables enrichis : catégorie, mode de paiement, référence de pièce

ALTER TABLE public.recettes
  ADD COLUMN IF NOT EXISTS categorie TEXT,
  ADD COLUMN IF NOT EXISTS mode_paiement TEXT,
  ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS categorie TEXT,
  ADD COLUMN IF NOT EXISTS mode_paiement TEXT,
  ADD COLUMN IF NOT EXISTS reference TEXT;

-- Commentaires des colonnes
COMMENT ON COLUMN public.recettes.categorie      IS 'Catégorie comptable de la recette';
COMMENT ON COLUMN public.recettes.mode_paiement  IS 'Mode de paiement utilisé';
COMMENT ON COLUMN public.recettes.reference      IS 'Numéro de pièce comptable / référence facture';
COMMENT ON COLUMN public.depenses.categorie      IS 'Catégorie comptable de la dépense';
COMMENT ON COLUMN public.depenses.mode_paiement  IS 'Mode de paiement utilisé';
COMMENT ON COLUMN public.depenses.reference      IS 'Numéro de pièce comptable / référence facture';
