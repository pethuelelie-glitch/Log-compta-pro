import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Users, Truck,
  Wallet, FileBarChart, Database, BookOpen, LogOut, Calculator, Menu, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/recettes", label: "Recettes", icon: ArrowDownCircle },
  { to: "/depenses", label: "Dépenses", icon: ArrowUpCircle },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/fournisseurs", label: "Fournisseurs", icon: Truck },
  { to: "/caisse", label: "Caisse", icon: Wallet },
  { to: "/rapports", label: "Rapports", icon: FileBarChart },
  { to: "/sauvegardes", label: "Sauvegardes", icon: Database },
  { to: "/documentation", label: "Documentation", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform md:translate-x-0 md:relative",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Log Compta Pro</div>
            <div className="text-xs opacity-70">Comptabilité PME</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to} to={to} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="text-xs opacity-70 mb-2">{user?.email}</div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold uppercase">
              {role ?? "…"}
            </span>
            <Button size="sm" variant="ghost" onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4 mr-1" />Sortir
            </Button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold">Log Compta Pro</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
