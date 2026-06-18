import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, updateUserRole } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UsersRound, ShieldAlert, ShieldCheck, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  component: Utilisateurs,
  ssr: false,
});

function Utilisateurs() {
  const qc = useQueryClient();
  const { user: currentUser, role } = useAuth();

  // ✅ CRITIQUE : les hooks DOIVENT être appelés avant tout return conditionnel
  // (règle des hooks React : ne jamais appeler un hook conditionnellement)
  const query = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: role === "admin", // ne requête que si admin
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "comptable" }) => {
      await updateUserRole(id, role);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Rôle mis à jour : ${vars.role === "admin" ? "Administrateur" : "Comptable"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Guard après les hooks
  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const users = query.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
        <p className="text-muted-foreground mt-1">
          Modifier les rôles et accès au système — {users.length} utilisateur{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Liste des utilisateurs
          </CardTitle>
          <CardDescription>
            Attribuez le rôle Administrateur ou Comptable. Attention : un administrateur a tous les
            droits, y compris la restauration des sauvegardes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground bg-muted/30">
                  <tr>
                    <th className="px-3 py-3 font-medium">Utilisateur</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Rôle Actuel</th>
                    <th className="px-3 py-3 font-medium w-48">Changer le rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                              {u.email?.charAt(0).toUpperCase() ?? <User className="h-4 w-4" />}
                            </div>
                            <span className="font-medium">{u.full_name || "—"}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-amber-400/20 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">
                                vous
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              u.role === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/20 text-secondary-foreground"
                            }`}
                          >
                            {u.role === "admin"
                              ? <ShieldCheck className="h-3 w-3" />
                              : <User className="h-3 w-3" />}
                            {u.role === "admin" ? "Administrateur" : "Comptable"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Select
                            disabled={isSelf || updateRole.isPending}
                            value={u.role || "comptable"}
                            onValueChange={(val: "admin" | "comptable") =>
                              updateRole.mutate({ id: u.id, role: val })
                            }
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="comptable">Comptable</SelectItem>
                              <SelectItem value="admin">Administrateur</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground p-3 bg-accent/50 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Vous ne pouvez pas modifier votre propre rôle pour éviter de bloquer l'accès
              administrateur. Les modifications de rôle sont effectives immédiatement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
