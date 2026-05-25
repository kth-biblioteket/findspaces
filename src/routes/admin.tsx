import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft, Library, Upload, X, Settings2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Space, type FilterOption, type FilterCategory, LUCIDE_ICON_CHOICES, getLucideIcon } from "@/lib/spaces";
import { useFilterOptions, groupOptions } from "@/lib/useFilterOptions";
import { OptionIcon } from "@/components/OptionIcon";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — KTH Biblioteket" }] }),
  component: AdminPage,
});

type FormState = Omit<Space, "id" | "image_url"> & { id?: string; image_url: string | null };

const emptyForm: FormState = {
  name: "", category: "", description: "", floor: "",
  intent: [], noise: "Tyst", equipment: [], facilities: [], image_url: null, sort_order: 999,
};

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  intent: "Jag vill arbeta",
  noise: "Ljudnivå",
  equipment: "Utrustning",
  facility: "Faciliteter",
};

function AdminPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase.from("spaces").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data as Space[];
    },
  });

  const reorderSpaces = useMutation({
    mutationFn: async (ordered: Space[]) => {
      // Assign sequential sort_order values (10, 20, 30...) and update in parallel
      await Promise.all(
        ordered.map((s, i) =>
          supabase.from("spaces").update({ sort_order: (i + 1) * 10 }).eq("id", s.id)
        )
      );
    },
    onMutate: async (ordered: Space[]) => {
      await qc.cancelQueries({ queryKey: ["spaces"] });
      const previous = qc.getQueryData<Space[]>(["spaces"]);
      qc.setQueryData<Space[]>(["spaces"], ordered);
      return { previous };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["spaces"], ctx.previous);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["spaces"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSpacesDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = spaces.findIndex((s) => s.id === active.id);
    const newIdx = spaces.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderSpaces.mutate(arrayMove(spaces, oldIdx, newIdx));
  };

  const { data: filterOptions = [] } = useFilterOptions();
  const groups = groupOptions(filterOptions);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name, category: f.category, description: f.description,
        floor: f.floor?.trim() ? f.floor.trim() : null,
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
              <p className="text-xs text-muted-foreground">Hantera lokaler och filteralternativ</p>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Till studentvy
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-10">
        {/* Spaces section */}
        <section>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Kategori">
                      <input
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Våningsplan">
                      <input
                        value={form.floor ?? ""}
                        onChange={(e) => setForm({ ...form, floor: e.target.value })}
                        placeholder="t.ex. Plan 3"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      />
                    </Field>
                  </div>
                  <Field label="Beskrivning">
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="Bild">
                    <div className="flex items-center gap-3 flex-wrap">
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
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Rekommenderad storlek: <strong>1200×900 px</strong> (4:3-format). JPG eller PNG, max 2 MB.
                      </p>
                    </div>
                  </Field>

                  <CheckboxGroup
                    label="Jag vill arbeta"
                    options={groups.intent.map((o) => o.label)}
                    values={form.intent}
                    onChange={(v) => setForm({ ...form, intent: v })}
                  />

                  <Field label="Ljudnivå">
                    <div className="flex gap-2 flex-wrap">
                      {groups.noise.map((o) => (
                        <button
                          key={o.id} type="button"
                          onClick={() => setForm({ ...form, noise: o.label })}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border",
                            form.noise === o.label
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary border-transparent"
                          )}
                        >
                          <OptionIcon option={o} className="h-4 w-4" /> {o.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <CheckboxGroup
                    label="Utrustning"
                    options={groups.equipment.map((o) => o.label)}
                    values={form.equipment}
                    onChange={(v) => setForm({ ...form, equipment: v })}
                  />
                  <CheckboxGroup
                    label="Faciliteter"
                    options={groups.facility.map((o) => o.label)}
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSpacesDragEnd}>
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr className="text-left">
                      <th className="px-2 py-3 w-8"></th>
                      <th className="px-4 py-3 font-semibold">Namn</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Våning</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Kategori</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Ljudnivå</th>
                      <th className="px-4 py-3 font-semibold text-right">Åtgärder</th>
                    </tr>
                  </thead>
                  <SortableContext items={spaces.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {spaces.map((s) => (
                        <SortableSpaceRow
                          key={s.id}
                          space={s}
                          onEdit={() => openEdit(s)}
                          onDelete={() => { if (confirm(`Ta bort "${s.name}"?`)) del.mutate(s.id); }}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            )}
          </div>
        </section>

        {/* Filter options section */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="h-5 w-5" />
            <h2 className="text-xl font-bold">Filteralternativ & ikoner</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Lägg till egna egenskaper för rummen. Du kan välja en befintlig ikon eller ladda upp en egen
            (SVG eller PNG, gärna kvadratisk 64×64 px, max 200 KB).
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => (
              <FilterCategoryCard
                key={cat}
                category={cat}
                title={CATEGORY_LABELS[cat]}
                items={groups[cat]}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterCategoryCard({
  category, title, items,
}: { category: FilterCategory; title: string; items: FilterOption[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FilterOption | null>(null);
  const [creating, setCreating] = useState(false);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("filter_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filter_options"] });
      toast.success("Borttagen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (ordered: FilterOption[]) => {
      await Promise.all(
        ordered.map((o, i) =>
          supabase.from("filter_options").update({ sort_order: (i + 1) * 10 }).eq("id", o.id)
        )
      );
    },
    onMutate: async (ordered: FilterOption[]) => {
      await qc.cancelQueries({ queryKey: ["filter_options"] });
      const previous = qc.getQueryData<FilterOption[]>(["filter_options"]);
      // Optimistic: replace items of this category, keep others
      if (previous) {
        const others = previous.filter((o) => o.category !== category);
        qc.setQueryData<FilterOption[]>(["filter_options"], [...others, ...ordered]);
      }
      return { previous };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["filter_options"], ctx.previous);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["filter_options"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorder.mutate(arrayMove(items, oldIdx, newIdx));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> Lägg till
        </button>
      </div>

      {items.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Inga alternativ ännu.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-border">
              {items.map((o) => (
                <SortableFilterOptionRow
                  key={o.id}
                  option={o}
                  onEdit={() => setEditing(o)}
                  onDelete={() => { if (confirm(`Ta bort "${o.label}"?`)) del.mutate(o.id); }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {(editing || creating) && (
        <FilterOptionDialog
          category={category}
          option={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function FilterOptionDialog({
  category, option, onClose,
}: { category: FilterCategory; option: FilterOption | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState(option?.label ?? "");
  const [iconUrl, setIconUrl] = useState<string | null>(option?.icon_url ?? null);
  const [defaultIcon, setDefaultIcon] = useState<string | null>(option?.default_icon ?? null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        category, label: label.trim(),
        icon_url: iconUrl,
        default_icon: iconUrl ? null : defaultIcon,
      };
      if (option) {
        const { error } = await supabase.from("filter_options").update(payload).eq("id", option.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("filter_options").insert({
          ...payload,
          sort_order: 999,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filter_options"] });
      toast.success("Sparat");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleUploadIcon = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("filter-icons").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("filter-icons").getPublicUrl(path);
      setIconUrl(data.publicUrl);
      toast.success("Ikon uppladdad");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{option ? "Redigera alternativ" : "Nytt alternativ"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field label="Etikett">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Egen ikon (valfritt)">
            <div className="flex items-center gap-3 flex-wrap">
              {iconUrl && (
                <div className="relative">
                  <img src={iconUrl} alt="" className="h-12 w-12 rounded-md bg-secondary object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => setIconUrl(null)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  ><X className="h-3 w-3" /></button>
                </div>
              )}
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <span>{uploading ? "Laddar upp..." : "Ladda upp ikon"}</span>
                <input
                  type="file" accept="image/svg+xml,image/png" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUploadIcon(e.target.files[0])}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              SVG eller PNG, kvadratisk (t.ex. 64×64 px), max 200 KB. Lämna tomt för att välja en standardikon nedan.
            </p>
          </Field>

          {!iconUrl && (
            <Field label="Standardikon">
              <div className="grid grid-cols-8 gap-1.5">
                {LUCIDE_ICON_CHOICES.map((name) => {
                  const Icon = getLucideIcon(name);
                  if (!Icon) return null;
                  const selected = defaultIcon === name;
                  return (
                    <button
                      key={name} type="button"
                      onClick={() => setDefaultIcon(selected ? null : name)}
                      title={name}
                      className={cn(
                        "h-9 w-9 rounded-md flex items-center justify-center border",
                        selected ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-transparent hover:bg-accent"
                      )}
                    ><Icon className="h-4 w-4" /></button>
                  );
                })}
              </div>
            </Field>
          )}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border">Avbryt</button>
          <button
            disabled={save.isPending || !label.trim()}
            onClick={() => save.mutate()}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
          >{save.isPending ? "Sparar..." : "Spara"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function SortableSpaceRow({
  space, onEdit, onDelete,
}: { space: Space; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: space.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border bg-card">
      <td className="px-2 py-3 text-muted-foreground">
        <button
          {...attributes} {...listeners}
          className="p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none"
          title="Dra för att flytta"
          aria-label="Dra för att flytta"
        ><GripVertical className="h-4 w-4" /></button>
      </td>
      <td className="px-4 py-3 font-medium">{space.name}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.floor ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.category}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.noise}</td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-1">
          <button onClick={onEdit} className="p-2 rounded-md hover:bg-accent" title="Redigera">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-md hover:bg-destructive/10 text-destructive" title="Ta bort">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SortableFilterOptionRow({
  option, onEdit, onDelete,
}: { option: FilterOption; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="py-2 flex items-center justify-between gap-3 bg-card">
      <div className="flex items-center gap-2 min-w-0">
        <button
          {...attributes} {...listeners}
          className="p-1 text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none"
          title="Dra för att flytta"
          aria-label="Dra för att flytta"
        ><GripVertical className="h-4 w-4" /></button>
        <span className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <OptionIcon option={option} className="h-4 w-4" />
        </span>
        <span className="text-sm truncate">{option.label}</span>
      </div>
      <div className="inline-flex gap-1">
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-accent" title="Redigera">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Ta bort">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
