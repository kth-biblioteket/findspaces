import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft, Library, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type Space, INTENT_OPTIONS, NOISE_OPTIONS, EQUIPMENT_OPTIONS, FACILITY_OPTIONS,
} from "@/lib/spaces";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — KTH Biblioteket" }] }),
  component: AdminPage,
});

type FormState = Omit<Space, "id" | "image_url"> & { id?: string; image_url: string | null };

const emptyForm: FormState = {
  name: "", category: "", description: "",
  intent: [], noise: "Tyst", equipment: [], facilities: [], image_url: null,
};

function AdminPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase.from("spaces").select("*").order("name");
      if (error) throw error;
      return data as Space[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name, category: f.category, description: f.description,
        intent: f.intent, noise: f.noise, equipment: f.equipment,
        facilities: f.facilities, image_url: f.image_url,
      };
      if (f.id) {
        const { error } = await supabase.from("spaces").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("spaces").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spaces"] });
      setOpen(false); setForm(emptyForm);
      toast.success("Sparat");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("spaces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spaces"] });
      toast.success("Borttagen");
    },
  });

  const handleUpload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("space-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("space-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    toast.success("Bild uppladdad");
  };

  const openEdit = (s: Space) => { setForm({ ...s }); setOpen(true); };
  const openNew = () => { setForm(emptyForm); setOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--kth-navy)] flex items-center justify-center">
              <Library className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">Admin — Studieplatser</h1>
              <p className="text-xs text-muted-foreground">Hantera lokaler</p>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Till studentvy
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Alla lokaler ({spaces.length})</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Ny lokal
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Redigera lokal" : "Ny lokal"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <Field label="Namn">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Kategori">
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Beskrivning">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="Bild">
                  <div className="flex items-center gap-3">
                    {form.image_url && (
                      <div className="relative">
                        <img src={form.image_url} alt="" className="h-16 w-20 rounded-md object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image_url: null })}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      <span>Ladda upp bild</span>
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                </Field>

                <CheckboxGroup
                  label="Jag vill arbeta"
                  options={[...INTENT_OPTIONS]}
                  values={form.intent}
                  onChange={(v) => setForm({ ...form, intent: v })}
                />

                <Field label="Ljudnivå">
                  <div className="flex gap-2 flex-wrap">
                    {NOISE_OPTIONS.map((o) => (
                      <button
                        key={o.label} type="button"
                        onClick={() => setForm({ ...form, noise: o.label })}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border",
                          form.noise === o.label
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-transparent"
                        )}
                      >
                        <o.icon className="h-4 w-4" /> {o.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <CheckboxGroup
                  label="Utrustning"
                  options={EQUIPMENT_OPTIONS.map((o) => o.label)}
                  values={form.equipment}
                  onChange={(v) => setForm({ ...form, equipment: v })}
                />
                <CheckboxGroup
                  label="Faciliteter"
                  options={FACILITY_OPTIONS.map((o) => o.label)}
                  values={form.facilities}
                  onChange={(v) => setForm({ ...form, facilities: v })}
                />
              </div>

              <DialogFooter>
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-border"
                >Avbryt</button>
                <button
                  disabled={save.isPending || !form.name || !form.category}
                  onClick={() => save.mutate(form)}
                  className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
                >{save.isPending ? "Sparar..." : "Spara"}</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Laddar...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Namn</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Kategori</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Ljudnivå</th>
                  <th className="px-4 py-3 font-semibold text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.category}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.noise}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-2 rounded-md hover:bg-accent" title="Redigera"
                        ><Pencil className="h-4 w-4" /></button>
                        <button
                          onClick={() => {
                            if (confirm(`Ta bort "${s.name}"?`)) del.mutate(s.id);
                          }}
                          className="p-2 rounded-md hover:bg-destructive/10 text-destructive" title="Ta bort"
                        ><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function CheckboxGroup({
  label, options, values, onChange,
}: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) =>
    onChange(values.includes(o) ? values.filter((x) => x !== o) : [...values, o]);
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o} type="button" onClick={() => toggle(o)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm border",
              values.includes(o)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-transparent"
            )}
          >{o}</button>
        ))}
      </div>
    </Field>
  );
}
