# ComptaVision Pro

Application web de comptabilité complète, puissante et premium, conçue pour les petites et moyennes entreprises (PME). Construite avec **React 19**, **TanStack Start**, **TypeScript**, **Tailwind CSS v4** et **Supabase**.

## ✨ Fonctionnalités Principales

- 🔐 **Authentification Sécurisée** : Connexion par email/mot de passe avec gestion stricte des rôles (Administrateur & Comptable).
- 📊 **Tableau de Bord Premium** : Visualisation en temps réel du total des produits, des charges, du résultat net et du taux de marge. Graphiques d'évolution et répartition en camembert par catégorie.
- 💰 **Gestion des Produits (Recettes)** : Saisie complète avec date, montant, description, catégorie, mode de paiement et référence de pièce.
- 💸 **Gestion des Charges (Dépenses)** : Suivi détaillé avec typologie comptable pour une parfaite maîtrise budgétaire.
- 🧑‍💼 **Annuaire Clients & Fournisseurs** : Base de données centralisée avec recherche instantanée.
- 🏦 **Trésorerie Intelligente** : Suivi des flux de liquidités (jour et mois), avec alerte visuelle automatique en cas de solde de trésorerie négatif.
- 📈 **Rapports Comptables** : Génération du journal comptable et du compte de résultat détaillé (méthode de caisse).
- 📄 **Exports Professionnels** : Téléchargement des rapports au format PDF avec en-tête stylisé, ou export complet de la base de données vers Microsoft Excel (.xlsx).
- 💾 **Sauvegardes** : Export au format JSON et restauration de bases de données (réservé aux administrateurs).
- 🛡️ **Sécurité Avancée** : Sauvegarde dans PostgreSQL via Supabase avec Row Level Security (RLS).

## 🧱 Stack Technique

| Couche        | Technologie                                  |
| ------------- | -------------------------------------------- |
| Frontend      | React 19 + TypeScript                        |
| Framework     | TanStack Start v1 (SSR + file-based routing) |
| UI & Styling  | Tailwind CSS v4 + shadcn/ui + Lucide Icons   |
| Charts        | Recharts                                     |
| Backend       | Supabase (PostgreSQL + Auth + RLS)           |
| Génération PDF| jsPDF + jspdf-autotable                      |
| Génération XLS| xlsx                                         |

## 🚀 Installation & Lancement

### Pré-requis
- [Node.js](https://nodejs.org/) (version 20+) ou [Bun](https://bun.sh/)
- Un compte Supabase ([supabase.com](https://supabase.com))

### 1. Installation

```bash
git clone <votre-repo>
cd log-compta-pro
npm install
```

### 2. Configuration Supabase
1. Créez un projet sur Supabase.
2. Appliquez les fichiers SQL présents dans `supabase/migrations/` dans l'ordre via l'éditeur SQL de Supabase (notamment la migration v2 pour l'ajout des catégories).
3. Créez un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL="https://<votre-projet>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<votre-anon-publishable-key>"

# Côté serveur (SSR)
SUPABASE_URL="https://<votre-projet>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<votre-anon-publishable-key>"
```

### 3. Démarrage

```bash
npm run dev
```

L'application démarre sur http://localhost:3000

## 🗄️ Structure de la Base de Données

```text
profiles       (id, full_name, email)
user_roles     (user_id, role: admin|comptable)
recettes       (id, date, montant, description, categorie, mode_paiement, reference)
depenses       (id, date, montant, description, categorie, mode_paiement, reference)
clients        (id, nom, telephone, adresse, email)
fournisseurs   (id, nom, telephone, adresse, email)
```

## 🎨 Identité Visuelle (Design Premium)
- **Palette** : Tons Oklch (Indigo profond, violet moyen, accents ambre/or).
- **Interface** : Mode clair/sombre, animations au survol (hover lift), Sidebar avec dégradés premium, indicateurs de performance (KPIs) avec code couleur comptable (vert/rouge).

## 📄 Licence
Ce projet est libre d'utilisation et a été généré en tant que solution comptable complète pour PME.
