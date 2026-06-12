import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Truck,
  Wallet,
  FileBarChart,
  Database,
  BookOpen,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard",     label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/recettes",      label: "Recettes",         icon: ArrowDownCircle },
  { to: "/depenses",      label: "Dépenses",          icon: ArrowUpCircle },
  { to: "/clients",       label: "Clients",           icon: Users },
  { to: "/fournisseurs",  label: "Fournisseurs",      icon: Truck },
  { to: "/caisse",        label: "Caisse",            icon: Wallet },
  { to: "/rapports",      label: "Rapports",          icon: FileBarChart },
  { to: "/sauvegardes",   label: "Sauvegardes",       icon: Database },
  { to: "/documentation", label: "Documentation",     icon: BookOpen },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform md:translate-x-0 md:relative print:hidden",
          "bg-sidebar text-sidebar-foreground",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg, oklch(0.22 0.09 272) 0%, oklch(0.17 0.07 270) 100%)",
        }}
      >
        {/* Logo zone */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border/60">
          <Logo size="sm" showText={true} variant="light" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-white/15 text-white shadow-sm nav-active"
                    : "text-sidebar-foreground/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-amber-300" : "")} />
                {label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}

          {/* Admin — gestion utilisateurs */}
          {role === "admin" && (
            <Link
              to="/utilisateurs"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 mt-2 border-t border-sidebar-border/40 pt-3",
                pathname === "/utilisateurs"
                  ? "bg-white/15 text-white shadow-sm nav-active"
                  : "text-sidebar-foreground/75 hover:bg-white/10 hover:text-white",
              )}
            >
              <ShieldCheck
                className={cn(
                  "h-4 w-4 shrink-0",
                  pathname === "/utilisateurs" ? "text-amber-300" : "",
                )}
              />
              Utilisateurs
              {pathname === "/utilisateurs" && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </Link>
          )}
        </nav>

        {/* Footer utilisateur */}
        <div className="border-t border-sidebar-border/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/30 text-xs font-bold uppercase text-white shrink-0">
              {user?.email?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.email}
              </p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  role === "admin"
                    ? "bg-amber-400/20 text-amber-300"
                    : "bg-white/10 text-white/70",
                )}
              >
                {role ?? "…"}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-white/10 hover:text-white gap-2"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden print:hidden shadow-sm">
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Logo size="sm" showText={false} variant="dark" className="[&_svg]:!text-primary" />
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto print:p-0 print:overflow-visible animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
