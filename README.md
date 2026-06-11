# Log Compta Pro

Application web de comptabilité pour petites entreprises (PME), construite avec **React 19**, **TanStack Start**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui** et **Supabase**.

## ✨ Fonctionnalités

- 🔐 **Authentification sécurisée** (email/mot de passe) avec gestion de session
- 👥 **Gestion des rôles** : Administrateur & Comptable (le 1er compte créé = admin)
- 📊 **Tableau de bord** avec statistiques et graphiques (recettes, dépenses, solde)
- 💰 **Module Recettes** (CRUD complet, recherche, filtres, total automatique)
- 💸 **Module Dépenses** (CRUD complet, recherche, filtres, total automatique)
- 🧑‍💼 **Module Clients** (CRUD complet, recherche instantanée)
- 🚚 **Module Fournisseurs** (CRUD complet, recherche instantanée)
- 🏦 **Caisse** (solde actuel, flux jour/mois)
- 📈 **Rapports comptables** : Journal, États, Bilan simplifié
- 📄 **Export PDF** des rapports + impression
- 🛡️ **Sécurité** : Row Level Security (RLS) PostgreSQL, validation Zod, JWT

## 🧱 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript |
| Framework | TanStack Start v1 (SSR + file-based routing) |
| UI | Tailwind CSS v4 + shadcn/ui + Lucide Icons |
| Charts | Recharts |
| Forms / State | React Hook Form, TanStack Query |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| PDF | jsPDF + jspdf-autotable |
| Notifications | Sonner |

## 🚀 Installation locale (VSCode)

### Pré-requis
- [Bun](https://bun.sh) (ou Node.js 20+)
- Un projet Supabase ([supabase.com](https://supabase.com))

### 1. Cloner le repo
```bash
git clone <votre-repo-github>
cd log-compta-pro
bun install
```

### 2. Configurer Supabase

#### 2.1. Créer un projet Supabase
Allez sur https://supabase.com → **New Project**.

#### 2.2. Rejouer les migrations
Le dossier `supabase/migrations/` contient tout le schéma SQL. Pour l'appliquer à votre projet Supabase :

**Option A — via l'interface Supabase** :
1. Ouvrez le **SQL Editor** dans le dashboard Supabase
2. Copiez-collez le contenu des fichiers `supabase/migrations/*.sql` (dans l'ordre)
3. Exécutez

**Option B — via Supabase CLI** :
```bash
npx supabase link --project-ref <votre-ref>
npx supabase db push
```

#### 2.3. Variables d'environnement
Créez un fichier `.env` à la racine :

```bash
VITE_SUPABASE_URL="https://<votre-projet>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<votre-anon-publishable-key>"
VITE_SUPABASE_PROJECT_ID="<votre-projet>"

# Côté serveur (SSR)
SUPABASE_URL="https://<votre-projet>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<votre-anon-publishable-key>"
SUPABASE_PROJECT_ID="<votre-projet>"
```

> Récupérez ces valeurs dans **Project Settings → API** du dashboard Supabase.

### 3. Démarrer le serveur de développement
```bash
bun run dev
```

L'app démarre sur http://localhost:3000

### 4. Créer le premier utilisateur
1. Allez sur `/auth`
2. Cliquez sur **Inscription**, remplissez le formulaire
3. ✨ Le **premier compte créé devient automatiquement Administrateur** (via trigger SQL `handle_new_user`)
4. Les suivants seront créés avec le rôle **Comptable** par défaut

## 🗄️ Schéma de base de données

```
profiles       (id, full_name, email, …)
user_roles     (user_id, role: admin|comptable)
recettes       (date, montant, description)
depenses       (date, montant, description)
clients        (nom, telephone, adresse, email)
fournisseurs   (nom, telephone, adresse, email)
```

Fonctions SQL : `has_role(uid, role)`, `handle_new_user()` (trigger auto), `set_updated_at()`.

## 🔒 Sécurité

- **RLS activée** sur toutes les tables `public.*`
- Politique : utilisateurs authentifiés ont accès complet aux données comptables partagées (modèle PME multi-utilisateurs)
- Rôles stockés dans `user_roles` (jamais dans `profiles`) pour éviter les escalades de privilèges
- Fonction `has_role()` en `SECURITY DEFINER` avec `EXECUTE` révoqué pour anon/authenticated

## 🏗️ Structure du projet

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── AppShell.tsx           # Layout avec sidebar
│   ├── TransactionPage.tsx    # CRUD recettes/dépenses
│   └── ContactPage.tsx        # CRUD clients/fournisseurs
├── integrations/supabase/     # client Supabase (auto-généré)
├── lib/
│   ├── auth.tsx               # AuthProvider + useAuth
│   ├── queries.ts             # Fonctions de requête
│   └── format.ts              # Formatters (devise, date)
├── routes/
│   ├── __root.tsx
│   ├── index.tsx              # → redirige
│   ├── auth.tsx               # Login / Signup
│   └── _authenticated/        # Routes protégées
│       ├── route.tsx          # Layout protégé
│       ├── dashboard.tsx
│       ├── recettes.tsx
│       ├── depenses.tsx
│       ├── clients.tsx
│       ├── fournisseurs.tsx
│       ├── caisse.tsx
│       └── rapports.tsx
└── styles.css                 # Design system (tokens OKLCH)
```

## 🎨 Design system

- **Primaire** : `#1E40AF` (bleu professionnel)
- **Secondaire** : `#3B82F6`
- **Succès** : vert OKLCH, **Danger** : rouge OKLCH
- **Police** : Inter (300–800)
- Sidebar sombre, dashboard clair, cartes avec ombres subtiles

## 📦 Build production
```bash
bun run build
```

## 💾 Module Sauvegardes (v2)
- **Export JSON** : snapshot complet de la base, restaurable
- **Export Excel** (.xlsx) : un onglet par module + onglet Bilan
- **Restauration** : import d'un fichier JSON (réservée aux administrateurs, écrase les données)

## 📚 Documentation intégrée (v2)
Une page **Documentation** dans l'app contient :
- Manuel utilisateur (accordéon par module)
- 4 diagrammes UML rendus dynamiquement avec **Mermaid** :
  1. Cas d'utilisation (Admin / Comptable)
  2. Diagramme de classes
  3. Séquence — Authentification
  4. Modèle entité-relation (ERD)

Clic droit sur un diagramme → *Enregistrer l'image* pour l'export PNG/SVG.

## 📄 Licence
Projet pédagogique. Libre d'utilisation et de modification.
