import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ArrowLeft, Library, Upload, X, Settings2, GripVertical,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type Space, type FilterOption, type FilterCategoryRow,
  LUCIDE_ICON_CHOICES, getLucideIcon, isLockedKey,
} from "@/lib/spaces";
import { useFilterOptions, groupOptionsByKey } from "@/lib/useFilterOptions";
import {
  useFilterCategories, useSaveCategory, useDeleteCategory,
  useReorderCategories, slugifyKey,
} from "@/lib/useFilterCategories";
import { OptionIcon } from "@/components/OptionIcon";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SpaceCard } from "@/components/SpaceCard";
import {
  useCardLayout, useSaveCardLayout,
  CARD_SECTION_KEYS, CARD_SECTION_LABELS, type CardSectionKey,
} from "@/lib/useCardLayout";
import {
  useLandingMessage, useSaveLandingMessage, DEFAULT_LANDING_MESSAGE,
} from "@/lib/useLandingMessage";
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

const MAX_IMAGES = 3;

type FormState = {
  id?: string;
  name: string;
  description: string;
  floor: string;
  capacity: string;
  intent: string[];
  noise: string;
  equipment: string[];
  facilities: string[];
  lokaltyp: string[];
  tags: Record<string, string[]>;
  images: string[];
  image_alts: string[];
  map_url: string;
  booking_url: string;
  notice: string;
  sort_order: number;
};

const emptyForm: FormState = {
  name: "", description: "", floor: "", capacity: "",
  intent: [], noise: "", equipment: [], facilities: [], lokaltyp: [],
  tags: {},
  images: [], image_alts: [], map_url: "", booking_url: "",
  notice: "",
  sort_order: 999,
};

function spaceToForm(s: Space): FormState {
  const images =
    s.images && s.images.length > 0
      ? s.images
      : s.image_url ? [s.image_url] : [];
  const image_alts = (s.image_alts ?? []).slice(0, images.length);
  while (image_alts.length < images.length) image_alts.push("");
  return {
    id: s.id,
    name: s.name, description: s.description,
    floor: s.floor ?? "",
    capacity: s.capacity != null ? String(s.capacity) : "",
    intent: s.intent ?? [], noise: s.noise ?? "",
    equipment: s.equipment ?? [], facilities: s.facilities ?? [],
    lokaltyp: s.lokaltyp ?? [],
    tags: (s.tags ?? {}) as Record<string, string[]>,
    images, image_alts,
    map_url: s.map_url ?? "", booking_url: s.booking_url ?? "",
    notice: s.notice ?? "",
    sort_order: s.sort_order,
  };
}


function getFormValues(form: FormState, key: string): string[] {
  switch (key) {
    case "intent": return form.intent;
    case "noise": return form.noise ? [form.noise] : [];
    case "equipment": return form.equipment;
    case "facility": return form.facilities;
    case "lokaltyp": return form.lokaltyp;
    default: return form.tags[key] ?? [];
  }
}

function setFormValues(form: FormState, key: string, values: string[]): FormState {
  switch (key) {
    case "intent": return { ...form, intent: values };
    case "noise": return { ...form, noise: values[0] ?? "" };
    case "equipment": return { ...form, equipment: values };
    case "facility": return { ...form, facilities: values };
    case "lokaltyp": return { ...form, lokaltyp: values };
    default: {
      const nextTags = { ...form.tags };
      if (values.length === 0) delete nextTags[key];
      else nextTags[key] = values;
      return { ...form, tags: nextTags };
    }
  }
}

function AdminPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase.from("spaces").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data as unknown as Space[];
    },
  });

  const reorderSpaces = useMutation({
    mutationFn: async (ordered: Space[]) => {
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
  const { data: categories = [] } = useFilterCategories();
  const byKey = groupOptionsByKey(filterOptions);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const capNum = f.capacity.trim() ? parseInt(f.capacity, 10) : NaN;
      const payload: any = {
        name: f.name, description: f.description,
        floor: f.floor?.trim() ? f.floor.trim() : null,
        capacity: Number.isFinite(capNum) ? capNum : null,
        intent: f.intent, noise: f.noise || "Tyst",
        equipment: f.equipment,
        facilities: f.facilities, lokaltyp: f.lokaltyp,
        tags: f.tags,
        images: f.images,
        image_alts: f.image_alts,
        image_url: f.images[0] ?? null,
        map_url: f.map_url.trim() || null,
        booking_url: f.booking_url.trim() || null,
        notice: f.notice.trim() || null,
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

  const handleUploadImage = async (file: File) => {
    if (form.images.length >= MAX_IMAGES) {
      toast.error(`Max ${MAX_IMAGES} bilder.`);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("space-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("space-images").getPublicUrl(path);
    setForm((f) => ({
      ...f,
      images: [...f.images, data.publicUrl],
      image_alts: [...f.image_alts, ""],
    }));
    toast.success("Bild uppladdad");
  };

  const moveImage = (i: number, delta: number) => {
    setForm((f) => {
      const j = i + delta;
      if (j < 0 || j >= f.images.length) return f;
      const imgs = [...f.images];
      const alts = [...f.image_alts];
      while (alts.length < imgs.length) alts.push("");
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      [alts[i], alts[j]] = [alts[j], alts[i]];
      return { ...f, images: imgs, image_alts: alts };
    });
  };

  const removeImage = (i: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, idx) => idx !== i),
      image_alts: f.image_alts.filter((_, idx) => idx !== i),
    }));
  };

  const setAlt = (i: number, value: string) => {
    setForm((f) => {
      const alts = [...f.image_alts];
      while (alts.length < f.images.length) alts.push("");
      alts[i] = value;
      return { ...f, image_alts: alts };
    });
  };


  const openEdit = (s: Space) => { setForm(spaceToForm(s)); setOpen(true); };
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="spaces" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="spaces">Lokaler</TabsTrigger>
            <TabsTrigger value="filters">Filteralternativ</TabsTrigger>
            <TabsTrigger value="layout">Kortlayout</TabsTrigger>
            <TabsTrigger value="landing">Startsida</TabsTrigger>
          </TabsList>

          <TabsContent value="spaces" className="space-y-4">
            <div className="flex items-center justify-between">
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
                      <Field label="Våningsplan">
                        <input
                          value={form.floor}
                          onChange={(e) => setForm({ ...form, floor: e.target.value })}
                          placeholder="t.ex. Plan 3"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Kapacitet (antal personer)">
                        <input
                          type="number"
                          min={1}
                          value={form.capacity}
                          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                          placeholder="t.ex. 4"
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

                    <Field label="Tillfällig information (visas som notis ovanpå lokalkortet, t.ex. ”Renoveras” eller ”Stängd tillfälligt”)">
                      <textarea
                        rows={2}
                        value={form.notice}
                        onChange={(e) => setForm({ ...form, notice: e.target.value })}
                        placeholder="Lämna tomt om ingen notis ska visas"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Länk till karta (map_url)">
                        <input
                          type="url"
                          value={form.map_url}
                          onChange={(e) => setForm({ ...form, map_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Länk till bokningsschema (booking_url)">
                        <input
                          type="url"
                          value={form.booking_url}
                          onChange={(e) => setForm({ ...form, booking_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        />
                      </Field>
                    </div>

                    <Field label={`Bilder (max ${MAX_IMAGES}, första är primär)`}>
                      <div className="space-y-3">
                        {form.images.length > 0 && (
                          <ul className="space-y-3">
                            {form.images.map((url, i) => (
                              <li key={url + i} className="flex gap-3 items-start rounded-lg border border-border p-2">
                                <div className="relative shrink-0">
                                  <img src={url} alt="" className="h-20 w-28 object-cover border border-border" />
                                  {i === 0 && (
                                    <span className="absolute top-1 left-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                                      Primär
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <input
                                    value={form.image_alts[i] ?? ""}
                                    onChange={(e) => setAlt(i, e.target.value)}
                                    placeholder="Alt-text (beskriv bilden för skärmläsare)"
                                    className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs"
                                  />
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button" onClick={() => moveImage(i, -1)}
                                      disabled={i === 0}
                                      className="h-7 w-7 rounded bg-secondary text-foreground flex items-center justify-center disabled:opacity-30"
                                      aria-label="Flytta upp"
                                    ><ChevronLeft className="h-3.5 w-3.5" /></button>
                                    <button
                                      type="button" onClick={() => moveImage(i, 1)}
                                      disabled={i === form.images.length - 1}
                                      className="h-7 w-7 rounded bg-secondary text-foreground flex items-center justify-center disabled:opacity-30"
                                      aria-label="Flytta ner"
                                    ><ChevronRight className="h-3.5 w-3.5" /></button>
                                    <button
                                      type="button" onClick={() => removeImage(i)}
                                      className="h-7 w-7 rounded bg-destructive/10 text-destructive flex items-center justify-center ml-auto"
                                      aria-label="Ta bort"
                                    ><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex items-center gap-3 flex-wrap">
                          <label className={cn(
                            "inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                            form.images.length >= MAX_IMAGES && "opacity-50 cursor-not-allowed"
                          )}>
                            <Upload className="h-4 w-4" />
                            <span>Ladda upp bild</span>
                            <input
                              type="file" accept="image/*" className="hidden"
                              disabled={form.images.length >= MAX_IMAGES}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground max-w-xs">
                            Rekommenderad storlek: <strong>1600×1200 px</strong> (4:3-format). JPG eller PNG, max 2 MB.
                            Upp till {MAX_IMAGES} bilder per lokal.
                          </p>
                        </div>
                      </div>
                    </Field>

                    {categories.map((cat) => (
                      <DynamicCategoryField
                        key={cat.id}
                        cat={cat}
                        options={byKey[cat.key] ?? []}
                        values={getFormValues(form, cat.key)}
                        onChange={(values) => setForm(setFormValues(form, cat.key, values))}
                      />
                    ))}
                  </div>

                  <DialogFooter>
                    <button
                      onClick={() => setOpen(false)}
                      className="px-4 py-2 rounded-lg text-sm border border-border"
                    >Avbryt</button>
                    <button
                      disabled={save.isPending || !form.name}
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
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">Lokaltyp</th>
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
          </TabsContent>

          <TabsContent value="filters">
            <FiltersTab categories={categories} byKey={byKey} />
          </TabsContent>

          <TabsContent value="layout">
            <CardLayoutTab />
          </TabsContent>

          <TabsContent value="landing">
            <LandingMessageTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DynamicCategoryField({
  cat, options, values, onChange,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  if (options.length === 0) return null;

  if (cat.is_single_select) {
    return (
      <Field label={cat.title}>
        <div className="flex gap-2 flex-wrap">
          {options.map((o) => (
            <button
              key={o.id} type="button"
              onClick={() => onChange(values[0] === o.label ? [] : [o.label])}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border",
                values[0] === o.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-transparent"
              )}
            >
              <OptionIcon option={o} className="h-4 w-4" /> {o.label}
            </button>
          ))}
        </div>
      </Field>
    );
  }

  const toggle = (label: string) =>
    onChange(values.includes(label) ? values.filter((x) => x !== label) : [...values, label]);

  return (
    <Field label={cat.title}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id} type="button" onClick={() => toggle(o.label)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border",
              values.includes(o.label)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-transparent"
            )}
          >
            <OptionIcon option={o} className="h-4 w-4" />
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function FiltersTab({
  categories, byKey,
}: { categories: FilterCategoryRow[]; byKey: Record<string, FilterOption[]> }) {
  const reorder = useReorderCategories();
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = categories.findIndex((c) => c.id === active.id);
    const newIdx = categories.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorder.mutate(arrayMove(categories, oldIdx, newIdx));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          <h2 className="text-xl font-bold">Filterkategorier & ikoner</h2>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Ny kategori
        </button>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Redigera kategorinamn direkt, dra för att ändra ordningen i studentvyn, och lägg till egna alternativ med valfri ikon.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {categories.map((cat) => (
              <SortableCategoryCard key={cat.id} cat={cat} items={byKey[cat.key] ?? []} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {creating && <CategoryDialog category={null} onClose={() => setCreating(false)} />}
    </div>
  );
}

function SortableCategoryCard({
  cat, items,
}: { cat: FilterCategoryRow; items: FilterOption[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <FilterCategoryCard cat={cat} items={items} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  );
}

function FilterCategoryCard({
  cat, items, dragAttributes, dragListeners,
}: {
  cat: FilterCategoryRow;
  items: FilterOption[];
  dragAttributes: any;
  dragListeners: any;
}) {
  const qc = useQueryClient();
  const saveCategory = useSaveCategory();
  const deleteCategory = useDeleteCategory();
  const [titleDraft, setTitleDraft] = useState(cat.title);
  const [editing, setEditing] = useState<FilterOption | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCat, setEditingCat] = useState(false);

  // Keep title input in sync if server changes
  if (titleDraft !== cat.title && !document.activeElement?.matches(`input[data-cat-id="${cat.id}"]`)) {
    // no-op — let server value win when not focused
  }

  const saveTitle = async () => {
    const next = titleDraft.trim();
    if (!next || next === cat.title) { setTitleDraft(cat.title); return; }
    try {
      await saveCategory.mutateAsync({ id: cat.id, title: next });
      toast.success("Titel uppdaterad");
    } catch (e: any) {
      toast.error(e.message);
      setTitleDraft(cat.title);
    }
  };

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

  const reorderOptions = useMutation({
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
      if (previous) {
        const others = previous.filter((o) => o.category !== cat.key);
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
    reorderOptions.mutate(arrayMove(items, oldIdx, newIdx));
  };

  const handleDeleteCategory = async () => {
    if (!confirm(`Ta bort kategorin "${cat.title}" och alla dess alternativ?`)) return;
    try {
      // First delete options for this category, then the category
      await supabase.from("filter_options").delete().eq("category", cat.key);
      await deleteCategory.mutateAsync(cat.id);
      toast.success("Kategori borttagen");
    } catch (e: any) {
      toast.error(e.message);
    }
  };


  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <button
          {...dragAttributes} {...dragListeners}
          className="p-1 text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none"
          title="Dra för att flytta kategorin"
          aria-label="Dra för att flytta kategorin"
        ><GripVertical className="h-4 w-4" /></button>

        <input
          data-cat-id={cat.id}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 min-w-0 font-semibold text-base bg-transparent border border-transparent rounded-md px-2 py-1 hover:border-border focus:border-primary focus:outline-none"
        />

        <button
          onClick={() => setEditingCat(true)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Egenskaper"
        ><Pencil className="h-3.5 w-3.5" /></button>

        <button
          onClick={handleDeleteCategory}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Ta bort kategori"
        ><Trash2 className="h-3.5 w-3.5" /></button>


        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline ml-1"
        >
          <Plus className="h-4 w-4" /> Lägg till
        </button>
      </div>

      {items.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground pl-7">Inga alternativ ännu.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-border pl-7">
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
          categoryKey={cat.key}
          option={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}

      {editingCat && (
        <CategoryDialog category={cat} onClose={() => setEditingCat(false)} />
      )}
    </div>
  );
}

function CategoryDialog({
  category, onClose,
}: { category: FilterCategoryRow | null; onClose: () => void }) {
  const saveCategory = useSaveCategory();
  const [title, setTitle] = useState(category?.title ?? "");
  const [style, setStyle] = useState<"list" | "pills">(category?.style ?? "pills");
  const [matchMode, setMatchMode] = useState<"any" | "all">(category?.match_mode ?? "any");
  const [isSingle, setIsSingle] = useState<boolean>(category?.is_single_select ?? false);

  const isNew = !category;


  const handleSave = async () => {
    try {
      const payload: any = { title: title.trim(), style, match_mode: matchMode, is_single_select: isSingle };
      if (isNew) {
        const key = slugifyKey(title);
        // Avoid colliding with locked keys
        const finalKey = isLockedKey(key) ? `${key}_2` : key;
        await saveCategory.mutateAsync({ ...payload, key: finalKey, sort_order: 999 });
      } else {
        await saveCategory.mutateAsync({ id: category!.id, ...payload });
      }
      toast.success("Sparat");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Ny filterkategori" : "Redigera kategori"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Titel">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Atmosfär"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Visningsstil i sidopanelen">
            <div className="flex gap-2">
              {(["pills", "list"] as const).map((s) => (
                <button
                  key={s} type="button" onClick={() => setStyle(s)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm border",
                    style === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-transparent"
                  )}
                >{s === "pills" ? "Pillerknappar" : "Lista med bockar"}</button>
              ))}
            </div>
          </Field>

          <Field label="Hur ska val matchas mot lokaler?">
            <div className="flex gap-2">
              {(["any", "all"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => setMatchMode(m)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm border text-left",
                    matchMode === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-transparent"
                  )}
                >
                  <div className="font-medium">{m === "any" ? "Något av" : "Alla av"}</div>
                  <div className="text-xs opacity-80">
                    {m === "any" ? "Lokalen matchar om något val finns" : "Lokalen måste ha alla valda"}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={isSingle}
              onChange={(e) => setIsSingle(e.target.checked)}
            />
            Endast ett alternativ kan väljas per lokal (som Ljudnivå)
          </label>

        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border">Avbryt</button>
          <button
            disabled={saveCategory.isPending || !title.trim()}
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
          >{saveCategory.isPending ? "Sparar..." : "Spara"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterOptionDialog({
  categoryKey, option, onClose,
}: { categoryKey: string; option: FilterOption | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState(option?.label ?? "");
  const [iconUrl, setIconUrl] = useState<string | null>(option?.icon_url ?? null);
  const [defaultIcon, setDefaultIcon] = useState<string | null>(option?.default_icon ?? null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        category: categoryKey, label: label.trim(),
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
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.lokaltyp?.join(", ") || "—"}</td>
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

// ---------------- Card Layout Tab ----------------

const DUMMY_SPACE: Space = {
  id: "dummy",
  name: "Exempel-lokal",
  category: "",
  description:
    "Detta är en förhandsvisning. Ändringar i listan här bredvid uppdaterar ordningen på sektionerna i alla lokalkort i studentvyn.",
  intent: [],
  noise: "Samtalston",
  equipment: ["Whiteboard", "Datorer"],
  facilities: ["Dagsljus", "Mat tillåten"],
  lokaltyp: ["Studieplats"],
  image_url: null,
  images: [],
  image_alts: [],
  map_url: "#",
  booking_url: "#",
  sort_order: 0,
  floor: "Plan 3",
  capacity: null,
  tags: {},
  notice: null,
};

function CardLayoutTab() {
  const { data: saved = [...CARD_SECTION_KEYS] } = useCardLayout();
  const [order, setOrder] = useState<CardSectionKey[]>(saved);
  const save = useSaveCardLayout();

  // Sync when remote layout loads/changes.
  useEffect(() => { setOrder(saved); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [saved.join("|")]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as CardSectionKey);
    const newIdx = order.indexOf(over.id as CardSectionKey);
    if (oldIdx < 0 || newIdx < 0) return;
    setOrder(arrayMove(order, oldIdx, newIdx));
  };

  const dirty = JSON.stringify(order) !== JSON.stringify(saved);

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Kortlayout</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dra för att ändra ordningen på sektionerna i lokalkorten. Bilden och
            knappen "Visa beskrivning" har fasta positioner.
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {order.map((k) => (
                <SortableSectionRow key={k} id={k} label={CARD_SECTION_LABELS[k]} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <button
            disabled={!dirty || save.isPending}
            onClick={() =>
              save.mutate(order, {
                onSuccess: () => toast.success("Layouten sparad"),
                onError: (e) => toast.error((e as Error).message),
              })
            }
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Spara layout
          </button>
          <button
            disabled={!dirty}
            onClick={() => setOrder(saved)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Återställ
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Förhandsvisning</h3>
        <SpaceCard space={DUMMY_SPACE} layoutOverride={order} />
      </div>
    </div>
  );
}

function SortableSectionRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Dra för att flytta"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm">{label}</span>
    </li>
  );
}

function LandingMessageTab() {
  const { data: remote, isLoading } = useLandingMessage();
  const save = useSaveLandingMessage();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (typeof remote === "string") setValue(remote);
  }, [remote]);

  return (
    <div className="bg-card rounded-2xl border border-border p-6 max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Välkomsttext på startsidan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visas när besökaren ännu inte valt något filter.
        </p>
      </div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isLoading}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save.mutate(value, { onSuccess: () => toast.success("Sparat") })}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          Spara
        </button>
        <button
          type="button"
          onClick={() => setValue(DEFAULT_LANDING_MESSAGE)}
          className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Återställ till standard
        </button>
      </div>
    </div>
  );
}

