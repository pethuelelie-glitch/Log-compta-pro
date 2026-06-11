import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listClients, listFournisseurs, type Client } from "@/lib/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

type Kind = "clients" | "fournisseurs";

export function ContactPage({ kind, title }: { kind: Kind; title: string }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: [kind], queryFn: kind === "clients" ? listClients : listFournisseurs });
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const filtered = (query.data ?? []).filter(c =>
    [c.nom, c.email, c.telephone, c.adresse].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const upsert = useMutation({
    mutationFn: async (p: { id?: string; nom: string; telephone: string; adresse: string; email: string }) => {
      const data = { nom: p.nom, telephone: p.telephone || null, adresse: p.adresse || null, email: p.email || null };
      if (p.id) { const { error } = await supabase.from(kind).update(data).eq("id", p.id); if (error) throw error; }
      else { const { error } = await supabase.from(kind).insert(data); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind] }); toast.success(editing ? "Modifié" : "Ajouté"); setOpenForm(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(kind).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind] }); toast.success("Supprimé"); setConfirmDel(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{query.data?.length ?? 0} enregistré(s)</p>
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
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => (
              <Card key={c.id} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{c.nom}</h3>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {c.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /><span className="truncate">{c.email}</span></div>}
                        {c.telephone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.telephone}</div>}
                        {c.adresse && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /><span className="truncate">{c.adresse}</span></div>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-6">Aucun enregistrement</p>}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer la suppression</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && remove.mutate(confirmDel)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormDialog({ editing, onSubmit, loading }: { editing: Client | null; onSubmit: (v: { nom: string; telephone: string; adresse: string; email: string }) => void; loading: boolean }) {
  const [nom, setNom] = useState(editing?.nom ?? "");
  const [telephone, setTel] = useState(editing?.telephone ?? "");
  const [adresse, setAdr] = useState(editing?.adresse ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Modifier" : "Ajouter"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ nom, telephone, adresse, email }); }} className="space-y-4">
        <div className="space-y-2"><Label>Nom *</Label><Input required value={nom} onChange={(e) => setNom(e.target.value)} /></div>
        <div className="space-y-2"><Label>Téléphone</Label><Input value={telephone ?? ""} onChange={(e) => setTel(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label>Adresse</Label><Input value={adresse ?? ""} onChange={(e) => setAdr(e.target.value)} /></div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "…" : "Enregistrer"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
