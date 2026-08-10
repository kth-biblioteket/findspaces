import { useState } from "react";
import { GripVertical, Pencil, Plus, Settings2, Trash2, Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OptionIcon } from "@/components/OptionIcon";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { type FilterCategoryRow, type FilterOption, LUCIDE_ICON_CHOICES, getLucideIcon, isLockedKey } from "@/lib/spaces";
import { slugifyKey, useDeleteCategory, useFilterCategories, useReorderCategories, useSaveCategory } from "@/lib/useFilterCategories";
import { useHiddenIcons } from "@/lib/useHiddenIcons";
import { cn } from "@/lib/utils";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Field } from "./shared";

export function FiltersTab({ categories, byKey }: { categories: FilterCategoryRow[]; byKey: Record<string, FilterOption[]> }) {
  const reorder = useReorderCategories();
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = categories.findIndex((c) => c.id === active.id);
    const newIdx = categories.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorder.mutate(arrayMove(categories, oldIdx, newIdx));
  };

  const editableCategories = categories;

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
        Redigera kategorinamn direkt, dra för att ändra ordningen i studentvyn, och lägg till egna alternativ med valfri
        ikon. Alternativ märkta <strong>Standard</strong> är kopplade till kod och kan bara döljas — inte raderas.
      </p>
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <strong className="font-medium text-foreground">Om ikonerna:</strong> De inbyggda ikonerna kommer från{" "}
        <a
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
        >
          Lucide
        </a>{" "}
        och är fria att använda (ISC-licens). Du kan även ladda upp egna ikoner per alternativ.
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={editableCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {editableCategories.map((cat) => (
              <SortableCategoryCard key={cat.id} cat={cat} items={byKey[cat.key] ?? []} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {creating && <CategoryDialog category={null} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function SortableCategoryCard({ cat, items }: { cat: FilterCategoryRow; items: FilterOption[] }) {
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

export function FilterCategoryCard({
  cat,
  items,
  dragAttributes,
  dragListeners,
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
    if (!next || next === cat.title) {
      setTitleDraft(cat.title);
      return;
    }
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
          supabase
            .from("filter_options")
            .update({ sort_order: (i + 1) * 10 })
            .eq("id", o.id),
        ),
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderOptions.mutate(arrayMove(items, oldIdx, newIdx));
  };

  const isSpecial = cat.special_kind != null;

  const handleDeleteCategory = async () => {
    if (isSpecial) {
      toast.error(
        "Denna kategori är kopplad till koden och kan inte tas bort. Du kan dölja enskilda alternativ istället.",
      );
      return;
    }
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
          {...dragAttributes}
          {...dragListeners}
          className="p-1 text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none"
          title="Dra för att flytta kategorin"
          aria-label="Dra för att flytta kategorin"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <input
          data-cat-id={cat.id}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="flex-1 min-w-0 font-semibold text-base bg-transparent border border-transparent rounded-md px-2 py-1 hover:border-border focus:border-primary focus:outline-none"
        />

        <button
          onClick={() => setEditingCat(true)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          title="Egenskaper"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleDeleteCategory}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
          title="Ta bort kategori"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

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
                  onDelete={() => {
                    if (o.is_seed) {
                      toast.error(
                        "Standardalternativ kan inte raderas — redigera etiketten/ikonen eller dölj det i alternativet.",
                      );
                      return;
                    }
                    if (confirm(`Ta bort "${o.label}"?`)) del.mutate(o.id);
                  }}
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
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {editingCat && <CategoryDialog category={cat} onClose={() => setEditingCat(false)} />}
    </div>
  );
}

export function CategoryDialog({ category, onClose }: { category: FilterCategoryRow | null; onClose: () => void }) {
  const saveCategory = useSaveCategory();
  const [title, setTitle] = useState(category?.title ?? "");
  const [titleEn, setTitleEn] = useState(category?.title_en ?? "");
  const [style, setStyle] = useState<"list" | "pills">(category?.style ?? "pills");
  const [matchMode, setMatchMode] = useState<"any" | "all">(category?.match_mode ?? "any");
  const [isSingle, setIsSingle] = useState<boolean>(category?.is_single_select ?? false);

  const isNew = !category;

  const handleSave = async () => {
    try {
      const payload: any = {
        title: title.trim(),
        title_en: titleEn.trim() || null,
        style,
        match_mode: matchMode,
        is_single_select: isSingle,
      };

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
          <Field label="Titel (SV)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Atmosfär"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Title (EN)">
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Leave empty to fall back to Swedish"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Visningsstil i sidopanelen">
            <div className="flex gap-2">
              {(["pills", "list"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm border",
                    style === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-transparent",
                  )}
                >
                  {s === "pills" ? "Pillerknappar" : "Lista med bockar"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Hur ska val matchas mot lokaler?">
            <div className="flex gap-2">
              {(["any", "all"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMatchMode(m)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm border text-left",
                    matchMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-transparent",
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
            <input type="checkbox" checked={isSingle} onChange={(e) => setIsSingle(e.target.checked)} />
            Endast ett alternativ kan väljas per lokal (som Ljudnivå)
          </label>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border">
            Avbryt
          </button>
          <button
            disabled={saveCategory.isPending || !title.trim()}
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saveCategory.isPending ? "Sparar..." : "Spara"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FilterOptionDialog({
  categoryKey,
  option,
  onClose,
}: {
  categoryKey: string;
  option: FilterOption | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: allCategories = [] } = useFilterCategories();
  const [label, setLabel] = useState(option?.label ?? "");
  const [labelEn, setLabelEn] = useState(option?.label_en ?? "");
  const [targetCategory, setTargetCategory] = useState(option?.category ?? categoryKey);
  const [iconUrl, setIconUrl] = useState<string | null>(option?.icon_url ?? null);
  const [defaultIcon, setDefaultIcon] = useState<string | null>(option?.default_icon ?? null);
  const [uploading, setUploading] = useState(false);
  const { data: hiddenIcons = [] } = useHiddenIcons();

  // Only ordinary categories can receive a moved option; the special ones
  // (lokaltyp/arbetssätt) are driven by dedicated columns and value keys.
  const movableCategories = allCategories.filter((c) => !c.special_kind);
  const canMove = Boolean(option) && movableCategories.some((c) => c.key === option?.category);

  const save = useMutation({
    mutationFn: async () => {
      const newLabel = label.trim();
      const payload = {
        label: newLabel,
        label_en: labelEn.trim() || null,
        icon_url: iconUrl,
        default_icon: iconUrl ? null : defaultIcon,
      };

      if (option) {
        const oldLabel = option.label;
        const oldCategory = option.category;
        const { error } = await supabase.from("filter_options").update(payload).eq("id", option.id);
        if (error) throw error;
        // Rename first (values on spaces are stored by label within the
        // current category), then move the option to its new category.
        if (oldLabel && oldLabel !== newLabel) {
          const { error: rpcErr } = await supabase.rpc("rename_filter_option" as any, {
            p_category: oldCategory,
            p_old_label: oldLabel,
            p_new_label: newLabel,
          });
          if (rpcErr) throw rpcErr;
        }
        if (canMove && targetCategory && targetCategory !== oldCategory) {
          const { error: moveErr } = await supabase.rpc("move_filter_option" as any, {
            p_option_id: option.id,
            p_new_category: targetCategory,
          });
          if (moveErr) throw moveErr;
        }
      } else {
        const { error } = await supabase.from("filter_options").insert({
          ...payload,
          category: categoryKey,
          sort_order: 999,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filter_options"] });
      qc.invalidateQueries({ queryKey: ["spaces"] });
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{option ? "Redigera alternativ" : "Nytt alternativ"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field label="Etikett (SV)">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Label (EN)">
            <input
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              placeholder="Leave empty to fall back to Swedish"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>

          {canMove && (
            <Field label="Kategori">
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {movableCategories.map((c) => (
                  <option key={c.id} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Byter du kategori följer filtret med på alla lokaler som redan har det.
              </p>
            </Field>
          )}


          <Field label="Egen ikon (valfritt)">
            <div className="flex items-center gap-3 flex-wrap">
              {iconUrl && (
                <div className="relative">
                  <img src={iconUrl} alt="" className="h-12 w-12 rounded-md bg-secondary object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => setIconUrl(null)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <span>{uploading ? "Laddar upp..." : "Ladda upp ikon"}</span>
                <input
                  type="file"
                  accept="image/svg+xml,image/png"
                  className="hidden"
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
              <div className="grid grid-cols-8 gap-1.5 max-h-72 overflow-y-auto rounded-md border border-border p-2">
                {LUCIDE_ICON_CHOICES.filter((n) => !hiddenIcons.includes(n)).map((name) => {
                  const Icon = getLucideIcon(name);
                  if (!Icon) return null;
                  const selected = defaultIcon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setDefaultIcon(selected ? null : name)}
                      title={name}
                      className={cn(
                        "h-9 w-9 rounded-md flex items-center justify-center border",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary border-transparent hover:bg-accent",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border">
            Avbryt
          </button>
          <button
            disabled={save.isPending || !label.trim()}
            onClick={() => save.mutate()}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
          >
            {save.isPending ? "Sparar..." : "Spara"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function SortableFilterOptionRow({
  option,
  onEdit,
  onDelete,
}: {
  option: FilterOption;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const toggleHidden = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("filter_options")
        .update({ hidden: !option.hidden } as any)
        .eq("id", option.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filter_options"] });
      toast.success(option.hidden ? "Synligt igen" : "Dolt");
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("py-2 flex items-center justify-between gap-3 bg-card", option.hidden && "opacity-60")}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Dra för att flytta ${option.label}`}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <OptionIcon option={option} className="h-4 w-4" />
        </span>
        <span className="text-sm truncate">{option.label}</span>
        {option.is_seed && (
          <span className="text-[10px] rounded-full bg-secondary px-1.5 py-0.5 text-muted-foreground uppercase tracking-wide">
            Standard
          </span>
        )}
        {option.hidden && (
          <span className="text-[10px] rounded-full bg-secondary px-1.5 py-0.5 text-muted-foreground uppercase tracking-wide">
            Dold
          </span>
        )}
      </div>
      <div className="inline-flex gap-1">
        {(option.is_seed || option.hidden) && (
          <button
            type="button"
            onClick={() => toggleHidden.mutate()}
            className="min-h-11 px-2 inline-flex items-center justify-center rounded-md hover:bg-accent text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={option.hidden ? `Visa ${option.label}` : `Dölj ${option.label}`}
          >
            {option.hidden ? "Visa" : "Dölj"}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Redigera ${option.label}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {!option.is_seed && (
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ta bort ${option.label}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

// ---------------- Card Layout Tab ----------------

