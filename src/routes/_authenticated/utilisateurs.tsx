import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, updateUserRole, type UserProfile } from "@/lib/queries";
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
import { UsersRound, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  beforeLoad: ({ context }) => {
    // Only admins can access this page
    if ((context as { auth?: { role?: string } }).auth?.role !== "admin") {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  component: Utilisateurs,
  ssr: false,
});

function Utilisateurs() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();

  const query = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "comptable" }) => {
      await updateUserRole(id, role);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Rôle mis à jour avec succès");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = query.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
        <p className="text-muted-foreground">Modifier les rôles et accès au système</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Nom</th>
                  <th>Email</th>
                  <th>Rôle Actuel</th>
                  <th className="w-48">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="py-3 font-medium">{u.full_name || "—"}</td>
                      <td className="py-3">{u.email}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {u.role || "comptable"}
                        </span>
                      </td>
                      <td className="py-3">
                        <Select
                          disabled={isSelf || updateRole.isPending}
                          value={u.role || "comptable"}
                          onValueChange={(val: "admin" | "comptable") =>
                            updateRole.mutate({ id: u.id, role: val })
                          }
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
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
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground p-3 bg-accent/50 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <p>
              Vous ne pouvez pas modifier votre propre rôle pour éviter de bloquer l'accès
              administrateur.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
