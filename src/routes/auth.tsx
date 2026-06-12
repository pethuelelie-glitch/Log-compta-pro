import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/brand";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, UserPlus, TrendingUp, Shield, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage, ssr: false });

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Compte créé avec succès ! Connexion en cours…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue sur " + APP_NAME + " !");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.22 0.09 272) 0%, oklch(0.32 0.14 280) 50%, oklch(0.20 0.075 265) 100%)",
        }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute top-[-80px] right-[-80px] h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-[-40px] h-48 w-48 rounded-full bg-amber-400/10" />

        {/* Logo */}
        <Logo size="lg" showText={true} variant="light" />

        {/* Features */}
        <div className="space-y-6 z-10">
          {[
            { icon: BarChart3, title: "Tableau de bord en temps réel", desc: "Visualisez vos recettes, dépenses et trésorerie instantanément." },
            { icon: TrendingUp,  title: "Rapports comptables complets",  desc: "Compte de résultat, journal comptable, export PDF & Excel." },
            { icon: Shield,      title: "Sécurité & multi-utilisateurs", desc: "Contrôle des rôles Admin/Comptable et sauvegardes automatiques." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-white/60 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer version */}
        <p className="text-xs text-white/40 z-10">
          {APP_NAME} v{APP_VERSION} — {APP_TAGLINE}
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-background">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Logo size="lg" showText={true} variant="dark" className="[&_.font-bold]:text-primary [&_div:last-child]:text-muted-foreground" />
        </div>

        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              {mode === "signin" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {mode === "signin"
                ? "Accédez à votre espace comptabilité"
                : "Rejoignez " + APP_NAME}
            </p>
          </div>

          {/* Toggle tabs */}
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {m === "signin" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nom complet</Label>
                <Input
                  id="name"
                  required
                  placeholder="Ex : Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Adresse email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-md"
              style={{
                background: "linear-gradient(135deg, oklch(0.44 0.22 270), oklch(0.56 0.20 278))",
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Chargement…
                </span>
              ) : mode === "signin" ? (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Se connecter
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer mon compte
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {APP_NAME} — Logiciel de comptabilité sécurisé par Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
