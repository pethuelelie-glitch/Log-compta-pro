import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME, APP_VERSION, APP_TAGLINE } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/documentation")({
  component: Documentation,
  ssr: false,
});

const USE_CASE = `flowchart LR
  A((Administrateur)) --> UC1[Gérer utilisateurs]
  A --> UC2[Restaurer sauvegarde]
  C((Comptable)) --> UC3[Saisir produits/recettes]
  C --> UC4[Saisir charges/dépenses]
  C --> UC5[Gérer clients]
  C --> UC6[Gérer fournisseurs]
  C --> UC7[Consulter trésorerie]
  C --> UC8[Générer rapports PDF/Excel]
  A --> UC3
  A --> UC4
  A --> UC5
  A --> UC6
  A --> UC7
  A --> UC8`;

const CLASS_DIAGRAM = `classDiagram
  class Profile {
    +UUID id
    +String full_name
    +String email
  }
  class UserRole {
    +UUID user_id
    +Role role
  }
  class Recette {
    +UUID id
    +Date date
    +Number montant
    +String description
    +String categorie
    +String mode_paiement
    +String reference
  }
  class Depense {
    +UUID id
    +Date date
    +Number montant
    +String description
    +String categorie
    +String mode_paiement
    +String reference
  }
  class Client {
    +UUID id
    +String nom
    +String email
    +String telephone
    +String adresse
  }
  class Fournisseur {
    +UUID id
    +String nom
    +String email
    +String telephone
    +String adresse
  }
  Profile "1" -- "0..*" UserRole : possède
  Profile "1" -- "0..*" Recette : saisit
  Profile "1" -- "0..*" Depense : saisit`;

const SEQUENCE = `sequenceDiagram
  actor U as Utilisateur
  participant W as Interface Web
  participant S as Supabase Auth
  participant DB as PostgreSQL+RLS
  U->>W: Saisit email/mot de passe
  W->>S: signInWithPassword()
  S-->>W: JWT + Session
  W->>DB: SELECT * FROM recettes (Bearer JWT)
  DB-->>W: Lignes filtrées par RLS
  W-->>U: Affiche tableau de bord`;

const ERD = `erDiagram
  PROFILES ||--o{ USER_ROLES : has
  PROFILES ||--o{ RECETTES : creates
  PROFILES ||--o{ DEPENSES : creates
  PROFILES {
    uuid id PK
    text full_name
    text email
  }
  USER_ROLES {
    uuid user_id FK
    enum role
  }
  RECETTES {
    uuid id PK
    date date
    numeric montant
    text description
  }
  DEPENSES {
    uuid id PK
    date date
    numeric montant
    text description
  }
  CLIENTS {
    uuid id PK
    text nom
    text email
    text telephone
    text adresse
  }
  FOURNISSEURS {
    uuid id PK
    text nom
    text email
    text telephone
    text adresse
  }`;

function Documentation() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation & Diagrammes UML</h1>
        <p className="text-muted-foreground mt-1">
          {APP_NAME} v{APP_VERSION} — {APP_TAGLINE}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Manuel utilisateur
          </CardTitle>
          <CardDescription>Guide d'utilisation des modules principaux</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <Item v="1" t="🔐 Connexion & rôles">
              Le premier compte créé devient automatiquement <strong>Administrateur</strong>. Les
              comptes suivants sont <strong>Comptables</strong> par défaut.
              Connectez-vous depuis la page <code>/auth</code>.
            </Item>
            <Item v="2" t="📊 Tableau de bord">
              Vue d'ensemble : total produits, total charges, résultat net, taux de marge, graphique
              d'évolution et répartition des charges par catégorie. Toutes les valeurs sont
              calculées en temps réel.
            </Item>
            <Item v="3" t="💰 Produits (Recettes) / 💸 Charges (Dépenses)">
              Cliquez sur <strong>Ajouter</strong>, renseignez date, montant, description,
              <strong> catégorie</strong>, <strong>mode de paiement</strong> et
              <strong> numéro de référence</strong>. Utilisez les filtres de recherche et de
              période pour retrouver rapidement une écriture. Les icônes ✏️ et 🗑️ permettent
              modification et suppression (avec confirmation).
            </Item>
            <Item v="4" t="🧑‍💼 Clients / 🚚 Fournisseurs">
              Annuaire complet avec nom, email, téléphone, adresse. La recherche est instantanée sur
              tous les champs.
            </Item>
            <Item v="5" t="🏦 Trésorerie">
              Affiche le solde réel (produits − charges), les flux du jour et du mois courant.
              Une alerte rouge s'affiche en cas de <strong>solde négatif</strong>.
            </Item>
            <Item v="6" t="📈 Rapports comptables">
              Génère le journal comptable, le <strong>compte de résultat</strong> (produits,
              charges, résultat net, taux de marge), avec filtre par période et
              <strong> export PDF</strong> professionnel ou impression.
              ⚠️ Note : il ne s'agit pas d'un bilan patrimonial mais d'un compte de résultat
              en comptabilité de caisse.
            </Item>
            <Item v="7" t="💾 Sauvegardes & Excel">
              Téléchargez une sauvegarde JSON ou un classeur Excel (.xlsx) avec un onglet par module
              + onglet Compte de résultat. Les administrateurs peuvent <strong>restaurer</strong>
              une sauvegarde JSON (écrase les données existantes).
            </Item>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Diagrammes UML
          </CardTitle>
          <CardDescription>
            Modélisation du système — exportables en image via clic droit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Diagram title="1. Diagramme de cas d'utilisation" chart={USE_CASE} />
          <Diagram title="2. Diagramme de classes" chart={CLASS_DIAGRAM} />
          <Diagram title="3. Diagramme de séquence — Authentification" chart={SEQUENCE} />
          <Diagram title="4. Modèle entité-relation (ERD)" chart={ERD} />
        </CardContent>
      </Card>
    </div>
  );
}

function Item({ v, t, children }: { v: string; t: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={v}>
      <AccordionTrigger className="text-left">{t}</AccordionTrigger>
      <AccordionContent className="text-muted-foreground">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Diagram({ title, chart }: { title: string; chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
      const id = `m-${Math.random().toString(36).slice(2)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e: unknown) {
        toast.error((e as Error).message ?? "Erreur de chargement");
        if (ref.current)
          ref.current.innerHTML = `<pre class="text-xs text-destructive">${(e as Error).message}</pre>`;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart]);
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <div ref={ref} className="rounded-lg border bg-card p-4 overflow-auto flex justify-center" />
    </div>
  );
}
