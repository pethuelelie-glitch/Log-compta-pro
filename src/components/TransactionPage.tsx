import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listRecettes, listDepenses, type Recette, type Depense } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type Kind = "recettes" | "depenses";
type Row = Recette | Depense;

export function TransactionPage({ kind, title }: { kind: Kind; title: string }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: [kind], queryFn: kind === "recettes" ? listRecettes : listDepenses });
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const filtered = (query.data ?? []).filter(r =>
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.date.includes(search) ||
    String(r.montant).includes(search)
  );
  const total = filtered.reduce((s, x) => s + Number(x.montant), 0);

  const upsert = useMutation({
    mutationFn: async (payload: { id?: string; date: string; montant: number; description: string }) => {
      if (payload.id) {
        const { error } = await supabase.from(kind).update({ date: payload.date, montant: payload.montant, description: payload.description }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(kind).insert({ date: payload.date, montant: payload.montant, description: payload.description });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind] });
      toast.success(editing ? "Modifié" : "Ajouté");
      setOpenForm(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(kind).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind] }); toast.success("Supprimé"); setConfirmDel(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">Total filtré : <span className="font-semibold text-foreground">{fmtMoney(total)}</span></p>
        </div>
        <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Ajouter</Button></DialogTrigger>
          <FormDialog editing={editing} onSubmit={(v) => upsert.mutate({ ...v, id: editing?.id })} loading={upsert.isPending} />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher description, date, montant…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr><th className="py-2">Date</th><th>Description</th><th className="text-right">Montant</th><th className="text-right w-32">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="py-2">{fmtDate(row.date)}</td>
                    <td>{row.description || "—"}</td>
                    <td className="text-right font-medium">{fmtMoney(row.montant)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(row); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Aucune entrée</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && remove.mutate(confirmDel)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormDialog({ editing, onSubmit, loading }: { editing: Row | null; onSubmit: (v: { date: string; montant: number; description: string }) => void; loading: boolean }) {
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [montant, setMontant] = useState(String(editing?.montant ?? ""));
  const [description, setDescription] = useState(editing?.description ?? "");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Modifier" : "Ajouter"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ date, montant: Number(montant), description }); }} className="space-y-4">
        <div className="space-y-2"><Label>Date</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Montant (FCFA)</Label><Input type="number" min="0" step="1" required value={montant} onChange={(e) => setMontant(e.target.value)} /></div>
        <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Vente produit X" /></div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "…" : "Enregistrer"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
