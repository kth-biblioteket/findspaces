import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useId, isValidElement, cloneElement, Children, type ReactElement } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ArrowLeft, Upload, X, Settings2, GripVertical,
  ChevronDown, AlertTriangle, Info, MapPin, CalendarClock, Users, Zap, ImageIcon,
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
  useUiText, useUiTextAdmin, useSaveUiText,
  UI_TEXT_DEFAULTS, UI_TEXT_DEFAULTS_EN, UI_TEXT_META, type UiTextKey,
} from "@/lib/useUiText";
import { useCapacityIcon, useSaveCapacityIcon } from "@/lib/useCapacityIcon";
import { useHiddenIcons } from "@/lib/useHiddenIcons";
import {
  useOccupancySettings, useSaveOccupancySettings,
  DEFAULT_SCHEDULE, WEEKDAYS, WEEKDAY_LABELS_SV,
  type OccupancySchedule, type DaySchedule, type Weekday,
} from "@/lib/useOccupancySettings";
import { ChairIcon } from "@/components/icons/ChairIcon";
import { AnalyticsTab } from "@/components/AnalyticsTab";
import { Switch } from "@/components/ui/switch";
import { useAnnouncementAdmin, useSaveAnnouncement } from "@/lib/useAnnouncement";


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

const MAX_IMAGES = 5;

type BulkAction =
  | "set_floor"
  | "set_floor_en"
  | "set_notice"
  | "clear_notice"
  | "set_notice_en"
  | "clear_notice_en"
  | "set_info"
  | "clear_info"
  | "set_info_en"
  | "clear_info_en"
  | "add_filter"
  | "remove_filter"
  | "show_occupancy_on"
  | "show_occupancy_off"
  | "show_capacity_on"
  | "show_capacity_off";

const BULK_ACTIONS: { value: BulkAction; label: string; needsValue: boolean; placeholder?: string }[] = [
  { value: "set_floor", label: "Sätt våningsplan (SV)", needsValue: true, placeholder: "t.ex. Plan 3" },
  { value: "set_floor_en", label: "Sätt våningsplan (EN)", needsValue: true, placeholder: "e.g. Floor 3" },
  { value: "set_notice", label: "Sätt notis SV (gul ruta)", needsValue: true, placeholder: "Kort notistext" },
  { value: "clear_notice", label: "Rensa notis SV (gul ruta)", needsValue: false },
  { value: "set_notice_en", label: "Sätt notis EN (gul ruta)", needsValue: true, placeholder: "Short notice text" },
  { value: "clear_notice_en", label: "Rensa notis EN (gul ruta)", needsValue: false },
  { value: "set_info", label: "Sätt info SV (neutral ruta)", needsValue: true, placeholder: "Kort infotext" },
  { value: "clear_info", label: "Rensa info SV (neutral ruta)", needsValue: false },
  { value: "set_info_en", label: "Sätt info EN (neutral ruta)", needsValue: true, placeholder: "Short info text" },
  { value: "clear_info_en", label: "Rensa info EN (neutral ruta)", needsValue: false },
  { value: "add_filter", label: "Lägg till filtervärde", needsValue: true },
  { value: "remove_filter", label: "Ta bort filtervärde", needsValue: true },
  { value: "show_occupancy_on", label: "Visa beläggning: PÅ", needsValue: false },
  { value: "show_occupancy_off", label: "Visa beläggning: AV", needsValue: false },
  { value: "show_capacity_on", label: "Visa kapacitet publikt: PÅ", needsValue: false },
  { value: "show_capacity_off", label: "Visa kapacitet publikt: AV", needsValue: false },
];

type FormState = {
  id?: string;
  slug: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  floor: string;
  floor_en: string;
  located_in: string;
  located_in_en: string;
  capacity: string;
  show_capacity_publicly: boolean;
  show_occupancy: boolean;
  countmatters_sensor_id: string;
  booking_room_number: string;
  intent: string[];
  noise: string[];
  equipment: string[];
  facilities: string[];
  lokaltyp: string[];
  tags: Record<string, string[]>;
  images: string[];
  image_alts: string[];
  image_alts_en: string[];
  map_url: string;
  map_url_en: string;
  booking_url: string;
  booking_url_en: string;
  group_booking_url: string;
  group_booking_url_en: string;
  book_now_url: string;
  book_now_url_en: string;
  notice: string;
  notice_en: string;
  info: string;
  info_en: string;
  sort_order: number;
};

const emptyForm: FormState = {
  slug: "",
  name: "", name_en: "",
  description: "", description_en: "",
  floor: "", floor_en: "",
  located_in: "", located_in_en: "",
  capacity: "",
  show_capacity_publicly: false,
  show_occupancy: true,
  countmatters_sensor_id: "",
  booking_room_number: "",
  intent: [], noise: [], equipment: [], facilities: [], lokaltyp: [],
  tags: {},
  images: [], image_alts: [], image_alts_en: [], map_url: "", map_url_en: "", booking_url: "", booking_url_en: "", group_booking_url: "", group_booking_url_en: "", book_now_url: "", book_now_url_en: "",
  notice: "", notice_en: "",
  info: "", info_en: "",
  sort_order: 999,
};


function spaceToForm(s: Space): FormState {
  const images =
    s.images && s.images.length > 0
      ? s.images
      : s.image_url ? [s.image_url] : [];
  const image_alts = (s.image_alts ?? []).slice(0, images.length);
  while (image_alts.length < images.length) image_alts.push("");
  const image_alts_en = (s.image_alts_en ?? []).slice(0, images.length);
  while (image_alts_en.length < images.length) image_alts_en.push("");
  return {
    id: s.id,
    slug: s.slug ?? "",
    name: s.name,
    name_en: s.name_en ?? "",
    description: s.description,
    description_en: s.description_en ?? "",
    floor: s.floor ?? "",
    floor_en: s.floor_en ?? "",
    located_in: s.located_in ?? "",
    located_in_en: s.located_in_en ?? "",
    capacity: s.capacity != null ? String(s.capacity) : "",
    show_capacity_publicly: s.show_capacity_publicly ?? false,
    show_occupancy: s.show_occupancy ?? true,
    countmatters_sensor_id: s.countmatters_sensor_id ?? "",
    booking_room_number: s.booking_room_number != null ? String(s.booking_room_number) : "",
    intent: s.intent ?? [], noise: s.noise ?? [],
    equipment: s.equipment ?? [], facilities: s.facilities ?? [],
    lokaltyp: s.lokaltyp ?? [],
    tags: (s.tags ?? {}) as Record<string, string[]>,
    images, image_alts, image_alts_en,
    map_url: s.map_url ?? "", map_url_en: s.map_url_en ?? "", booking_url: s.booking_url ?? "", booking_url_en: s.booking_url_en ?? "",
    group_booking_url: s.group_booking_url ?? "",
    group_booking_url_en: s.group_booking_url_en ?? "",
    book_now_url: s.book_now_url ?? "",
    book_now_url_en: s.book_now_url_en ?? "",
    notice: s.notice ?? "",
    notice_en: s.notice_en ?? "",
    info: s.info ?? "",
    info_en: s.info_en ?? "",
    sort_order: s.sort_order,
  };
}



function getFormValues(form: FormState, key: string): string[] {
  switch (key) {
    case "intent": return form.intent;
    case "noise": return form.noise;
    case "equipment": return form.equipment;
    case "facility": return form.facilities;
    case "lokaltyp": return form.lokaltyp;
    default: return form.tags[key] ?? [];
  }
}

function setFormValues(form: FormState, key: string, values: string[]): FormState {
  switch (key) {
    case "intent": return { ...form, intent: values };
    case "noise": return { ...form, noise: values };
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
  const navigate = Route.useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageDates, setImageDates] = useState<Record<string, string | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("set_floor");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
      else setUserEmail(session.user.email ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const fetchImageDates = useCallback(async (imageUrls: string[]) => {
    try {
      const { data: files, error } = await supabase.storage.from("space-images").list("");
      if (error || !files) return;
      const byName = new Map(files.map((f) => [f.name, f.created_at]));
      const next: Record<string, string | null> = {};
      for (const url of imageUrls) {
        const name = url.split("/").pop()?.split("?")[0] ?? "";
        next[url] = byName.get(name) ?? null;
      }
      setImageDates(next);
    } catch {
      // tyst fallbacks — visar bara inget datum
    }
  }, []);



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
        slug: f.slug.trim() ? f.slug.trim().toLowerCase() : null,
        name: f.name,
        name_en: f.name_en.trim() || null,
        description: f.description,
        description_en: f.description_en.trim() || null,
        floor: f.floor?.trim() ? f.floor.trim() : null,
        floor_en: f.floor_en?.trim() ? f.floor_en.trim() : null,
        located_in: f.located_in?.trim() ? f.located_in.trim() : null,
        located_in_en: f.located_in_en?.trim() ? f.located_in_en.trim() : null,
        capacity: Number.isFinite(capNum) ? capNum : null,
        show_capacity_publicly: f.show_capacity_publicly,
        show_occupancy: f.show_occupancy,
        countmatters_sensor_id: f.countmatters_sensor_id.trim() || null,
        booking_room_number: f.booking_room_number.trim()
          ? Number.parseInt(f.booking_room_number, 10) || null
          : null,
        intent: f.intent, noise: f.noise,
        equipment: f.equipment,
        facilities: f.facilities, lokaltyp: f.lokaltyp,
        tags: f.tags,
        images: f.images,
        image_alts: f.image_alts,
        image_alts_en: f.image_alts_en,
        image_url: f.images[0] ?? null,
        map_url: f.map_url.trim() || null,
        map_url_en: f.map_url_en.trim() || null,
        booking_url: f.booking_url.trim() || null,
        booking_url_en: f.booking_url_en.trim() || null,
        group_booking_url: f.group_booking_url.trim() || null,
        group_booking_url_en: f.group_booking_url_en.trim() || null,
        book_now_url: f.book_now_url.trim() || null,
        book_now_url_en: f.book_now_url_en.trim() || null,
        notice: f.notice.trim() || null,
        notice_en: f.notice_en.trim() || null,
        info: f.info.trim() || null,
        info_en: f.info_en.trim() || null,

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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = () => setSelectedIds(new Set(spaces.map((s) => s.id)));

  const [bulkCategory, setBulkCategory] = useState<string>("lokaltyp");

  const applyBulk = async () => {
    if (selectedIds.size === 0) return;
    const meta = BULK_ACTIONS.find((a) => a.value === bulkAction);
    if (!meta) return;
    const val = bulkValue.trim();
    if (meta.needsValue && !val) {
      toast.error("Ange ett värde");
      return;
    }
    if (!confirm(`Tillämpa "${meta.label}" på ${selectedIds.size} lokal(er)?`)) return;

    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const selectedSpaces = spaces.filter((s) => ids.includes(s.id));

      const simple: Record<string, any> | null = (() => {
        switch (bulkAction) {
          case "set_floor": return { floor: val };
          case "set_floor_en": return { floor_en: val };
          case "set_notice": return { notice: val };
          case "clear_notice": return { notice: null };
          case "set_notice_en": return { notice_en: val };
          case "clear_notice_en": return { notice_en: null };
          case "set_info": return { info: val };
          case "clear_info": return { info: null };
          case "set_info_en": return { info_en: val };
          case "clear_info_en": return { info_en: null };
          case "show_occupancy_on": return { show_occupancy: true };
          case "show_occupancy_off": return { show_occupancy: false };
          case "show_capacity_on": return { show_capacity_publicly: true };
          case "show_capacity_off": return { show_capacity_publicly: false };
          default: return null;
        }
      })();

      if (simple) {
        const { error } = await supabase.from("spaces").update(simple as any).in("id", ids);
        if (error) throw error;
      } else if (bulkAction === "add_filter" || bulkAction === "remove_filter") {
        const cat = bulkCategory;
        if (cat === "vaningsplan") {
          throw new Error("Använd 'Sätt våningsplan' för plan");
        }
        // Map category key to spaces column (or tags JSON)
        const colMap: Record<string, string> = {
          intent: "intent", noise: "noise", equipment: "equipment",
          facility: "facilities", lokaltyp: "lokaltyp",
        };
        const col = colMap[cat];
        await Promise.all(
          selectedSpaces.map((s) => {
            if (col) {
              const cur = Array.isArray((s as any)[col]) ? ((s as any)[col] as string[]) : [];
              const next = bulkAction === "add_filter"
                ? (cur.includes(val) ? cur : [...cur, val])
                : cur.filter((x) => x !== val);
              return supabase.from("spaces").update({ [col]: next } as any).eq("id", s.id);
            } else {
              const tags = (s.tags && typeof s.tags === "object" && !Array.isArray(s.tags))
                ? { ...(s.tags as Record<string, string[]>) } : {};
              const cur = Array.isArray(tags[cat]) ? tags[cat] : [];
              const next = bulkAction === "add_filter"
                ? (cur.includes(val) ? cur : [...cur, val])
                : cur.filter((x) => x !== val);
              if (next.length === 0) delete tags[cat]; else tags[cat] = next;
              return supabase.from("spaces").update({ tags: tags as any }).eq("id", s.id);
            }
          })
        );
      }

      toast.success(`Uppdaterade ${ids.length} lokal(er)`);
      setBulkValue("");
      clearSelection();
      qc.invalidateQueries({ queryKey: ["spaces"] });
    } catch (e: any) {
      toast.error(e.message ?? "Fel vid bulk-uppdatering");
    } finally {
      setBulkBusy(false);
    }
  };



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
    const nowIso = new Date().toISOString();
    setForm((f) => ({
      ...f,
      images: [...f.images, data.publicUrl],
      image_alts: [...f.image_alts, ""],
      image_alts_en: [...f.image_alts_en, ""],
    }));
    setImageDates((prev) => ({ ...prev, [data.publicUrl]: nowIso }));
    toast.success("Bild uppladdad");
  };

  const reorderImagesByIndex = (oldIdx: number, newIdx: number) => {
    setForm((f) => {
      if (oldIdx < 0 || newIdx < 0 || oldIdx >= f.images.length || newIdx >= f.images.length) return f;
      const alts = [...f.image_alts];
      const altsEn = [...f.image_alts_en];
      while (alts.length < f.images.length) alts.push("");
      while (altsEn.length < f.images.length) altsEn.push("");
      return {
        ...f,
        images: arrayMove(f.images, oldIdx, newIdx),
        image_alts: arrayMove(alts, oldIdx, newIdx),
        image_alts_en: arrayMove(altsEn, oldIdx, newIdx),
      };
    });
  };

  const handleImagesDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = form.images.map((u, i) => `${i}::${u}`);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    reorderImagesByIndex(oldIdx, newIdx);
  };

  const removeImage = (i: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, idx) => idx !== i),
      image_alts: f.image_alts.filter((_, idx) => idx !== i),
      image_alts_en: f.image_alts_en.filter((_, idx) => idx !== i),
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

  const setAltEn = (i: number, value: string) => {
    setForm((f) => {
      const alts = [...f.image_alts_en];
      while (alts.length < f.images.length) alts.push("");
      alts[i] = value;
      return { ...f, image_alts_en: alts };
    });
  };


  const openEdit = (s: Space) => {
    const f = spaceToForm(s);
    setForm(f);
    setImageDates({});
    setOpen(true);
    fetchImageDates(f.images);
  };
  const openNew = () => { setForm(emptyForm); setImageDates({}); setOpen(true); };

  useEffect(() => {
    if (open && form.images.length > 0) {
      fetchImageDates(form.images);
    }
  }, [open, form.images.length, fetchImageDates]);

  if (!authChecked) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">
        Laddar...
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold leading-tight">Admin — Studieplatser</h1>
          <div className="flex items-center gap-3">
            {userEmail && <span className="hidden sm:inline text-xs text-muted-foreground">{userEmail}</span>}
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Logga ut
            </button>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Till studentvy
            </Link>
          </div>
        </div>
      </header>


      <main id="main" tabIndex={-1} className="max-w-6xl mx-auto px-4 sm:px-6 py-6 focus-visible:outline-none">
        <Tabs defaultValue="spaces" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="spaces">Lokaler</TabsTrigger>
            <TabsTrigger value="filters">Filteralternativ</TabsTrigger>
            <TabsTrigger value="layout">Kortlayout</TabsTrigger>
            <TabsTrigger value="landing">Texter</TabsTrigger>
            <TabsTrigger value="occupancy">Beläggning</TabsTrigger>
            <TabsTrigger value="analytics">Statistik</TabsTrigger>
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
                    {form.id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tekniskt ID: <code className="bg-secondary px-1 py-0.5 rounded text-xs">{form.id}</code>
                      </p>
                    )}
                  </DialogHeader>

                  <div className="space-y-5 py-2">
                    <Field label="Kort-ID / slug (valfritt)">
                      <input
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
                        placeholder="t.ex. maxwell eller norra-arkaden"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Kort, läsbart ID som används i interna länkar och delbara URL:er. Endast små bokstäver, siffror och bindestreck. Lämna tomt om du inte vill ha en slug — då används det tekniska ID:t.
                        {form.slug && (
                          <>
                            {" "}Exempel på länksyntax: <code className="bg-secondary px-1 py-0.5 rounded">[[{form.slug}|valfri text]]</code>
                            {" · "}Direktlänk: <code className="bg-secondary px-1 py-0.5 rounded">?highlight={form.slug}</code>
                          </>
                        )}
                      </p>
                    </Field>
                    <Field label="Namn (SV)">
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Name (EN)">
                      <input
                        value={form.name_en}
                        onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                        placeholder="Lämna tomt för att använda svenska som fallback"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Våningsplan (SV)">
                        <input
                          value={form.floor}
                          onChange={(e) => setForm({ ...form, floor: e.target.value })}
                          placeholder="t.ex. Plan 3"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Floor (EN)">
                        <input
                          value={form.floor_en}
                          onChange={(e) => setForm({ ...form, floor_en: e.target.value })}
                          placeholder="e.g. Floor 3"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Ligger i lokal (SV)">
                        <input
                          value={form.located_in}
                          onChange={(e) => setForm({ ...form, located_in: e.target.value })}
                          placeholder="t.ex. Biblioteket"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Located in (EN)">
                        <input
                          value={form.located_in_en}
                          onChange={(e) => setForm({ ...form, located_in_en: e.target.value })}
                          placeholder="e.g. The Library"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        />
                      </Field>
                    </div>



                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.show_capacity_publicly}
                        onChange={(e) => setForm({ ...form, show_capacity_publicly: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer accent-[var(--kth-blue)]"
                      />
                      <span>Visa antal platser publikt på lokalkortet</span>
                    </label>

                    <details className="rounded-lg border border-border bg-muted/30 group">
                      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold flex items-center justify-between hover:bg-accent/50 rounded-lg">
                        <span>Realtidsdata (beläggning)</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="p-3 pt-2 space-y-2 border-t border-border">
                        <Field label="Countmatters sensor-ID (realtidsbeläggning)">
                          <input
                            value={form.countmatters_sensor_id}
                            onChange={(e) => setForm({ ...form, countmatters_sensor_id: e.target.value })}
                            placeholder="t.ex. Newton"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                          />
                        </Field>
                        <label className="flex items-start gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.show_occupancy}
                            onChange={(e) => setForm({ ...form, show_occupancy: e.target.checked })}
                            className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer accent-[var(--kth-blue)]"
                          />
                          <span>Visa beläggningsindikator på lokalkortet (kan slås av vid tekniska problem utan att radera sensor-ID:t)</span>
                        </label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Ange <strong>zonnamnet</strong> exakt som det står i Countmatters
                          (t.ex. <span className="font-mono">Newton</span>, <span className="font-mono">Ångdomen</span>,
                          {" "}<span className="font-mono">Södra Galleriet</span>). När namnet matchar en zon i
                          KTH:s realtids-API visas en indikator (grön/gul/röd) baserat på aktuell beläggning
                          i förhållande till zonens maxantal. Lämna tomt för lokaler utan mätare.
                        </p>
                      </div>
                    </details>


                    <Field label="Arbetssätt (vilka val i ”Jag vill arbeta” som lokalen passar)">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "enskilt", label: "Enskilt" },
                          { key: "tillsammans", label: "Tillsammans" },
                          { key: "grupprum", label: "I grupprum" },
                        ].map((wm) => {
                          const active = form.intent.includes(wm.key);
                          return (
                            <button
                              key={wm.key}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? form.intent.filter((v) => v !== wm.key)
                                  : [...form.intent, wm.key];
                                setForm({ ...form, intent: next });
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm transition",
                                active
                                  ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                                  : "bg-card text-foreground border-border hover:bg-accent"
                              )}
                            >
                              {wm.label}
                            </button>
                          );
                        })}
                      </div>
                    </Field>


                    <details className="rounded-lg border border-border bg-muted/30 group">
                      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold flex items-center justify-between hover:bg-accent/50 rounded-lg">
                        <span>Texter (beskrivning och meddelanden)</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="p-3 pt-2 space-y-4 border-t border-border">
                        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Tips:</strong> Du kan använda HTML i beskrivningstexten för att lägga in länkar och enkel formatering. Exempel:
                          <code className="block mt-1 bg-card border border-border rounded px-2 py-1 text-[11px] font-mono whitespace-pre-wrap break-all">
                            Läs mer på &lt;a href="https://kth.se" target="_blank" rel="noopener"&gt;kth.se&lt;/a&gt;.
                          </code>
                          Tillåtna taggar: <code>&lt;a&gt;</code>, <code>&lt;b&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;i&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;br&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>, <code>&lt;li&gt;</code>. Länkar öppnas i ny flik automatiskt.
                        </div>
                        <Field label="Beskrivning (SV)">
                          <textarea
                            rows={4}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                          />
                        </Field>
                        <Field label="Description (EN)">
                          <textarea
                            rows={4}
                            value={form.description_en}
                            onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                            placeholder="Lämna tomt för att använda svenska som fallback"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                          />
                        </Field>

                        <Field label="Tillfällig viktig information (gul ruta) (SV)">
                          <textarea
                            rows={2}
                            value={form.notice}
                            onChange={(e) => setForm({ ...form, notice: e.target.value })}
                            placeholder="Lämna tomt om ingen notis ska visas"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Använd för tillfälliga eller akuta meddelanden (t.ex. stängt idag). Visas med amber-färgad markering. Du kan länka till annat kort med <code className="bg-secondary px-1 py-0.5 rounded text-xs">[[slug|valfri text]]</code> eller till en extern webbsida med HTML: <code className="bg-secondary px-1 py-0.5 rounded text-xs">{`<a href="https://kth.se">KTH</a>`}</code>.
                          </p>
                        </Field>
                        <Field label="Tillfällig viktig information (gul ruta) (EN)">
                          <textarea
                            rows={2}
                            value={form.notice_en}
                            onChange={(e) => setForm({ ...form, notice_en: e.target.value })}
                            placeholder="Leave empty to fall back to Swedish"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                          />
                        </Field>

                        <Field label="Information på kortet (SV)">
                          <textarea
                            rows={2}
                            value={form.info}
                            onChange={(e) => setForm({ ...form, info: e.target.value })}
                            placeholder='T.ex. "Möblerna är tillfälliga och byts ut under hösten."'
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Neutral information som alltid visas på kortet. Använd syntaxen <code className="bg-secondary px-1 py-0.5 rounded text-xs">[[slug|valfri text]]</code> för att länka till ett annat kort (t.ex. <code className="bg-secondary px-1 py-0.5 rounded text-xs">[[{form.slug || "maxwell"}|Maxwell]]</code>). Länkar till externa webbsidor läggs in med HTML: <code className="bg-secondary px-1 py-0.5 rounded text-xs">{`<a href="https://kth.se">KTH</a>`}</code>.
                          </p>
                        </Field>
                        <Field label="Information på kortet (EN)">
                          <textarea
                            rows={2}
                            value={form.info_en}
                            onChange={(e) => setForm({ ...form, info_en: e.target.value })}
                            placeholder="Leave empty to fall back to Swedish"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            English info. Use <code className="bg-secondary px-1 py-0.5 rounded text-xs">[[space-id|optional text]]</code> for internal links, or standard HTML like <code className="bg-secondary px-1 py-0.5 rounded text-xs">{`<a href="https://kth.se">KTH</a>`}</code> for external links.
                          </p>
                        </Field>
                      </div>
                    </details>


                    <details className="rounded-lg border border-border bg-muted/30 group">
                      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold flex items-center justify-between hover:bg-accent/50 rounded-lg">
                        <span>Länkar (karta och bokning)</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="p-3 pt-2 space-y-4 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Länk till karta – SV (map_url)">
                            <input
                              type="url"
                              value={form.map_url}
                              onChange={(e) => setForm({ ...form, map_url: e.target.value })}
                              placeholder="https://..."
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                          <Field label="Link to map – EN (map_url_en)">
                            <input
                              type="url"
                              value={form.map_url_en}
                              onChange={(e) => setForm({ ...form, map_url_en: e.target.value })}
                              placeholder="https://... (lämna tomt för att använda svenska som fallback)"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                          <Field label="Länk till bokningsschema för övningssalar – SV (booking_url)">
                            <input
                              type="url"
                              value={form.booking_url}
                              onChange={(e) => setForm({ ...form, booking_url: e.target.value })}
                              placeholder="https://..."
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Används för övningssalar. För grupprum, se nedan.
                            </p>
                          </Field>
                          <Field label="Link to booking schedule for practice rooms – EN (booking_url_en)">
                            <input
                              type="url"
                              value={form.booking_url_en}
                              onChange={(e) => setForm({ ...form, booking_url_en: e.target.value })}
                              placeholder="https://... (lämna tomt för att använda svenska som fallback)"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                        </div>
                      </div>
                    </details>

                    <details className="rounded-lg border border-border bg-muted/30 group">
                      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold flex items-center justify-between hover:bg-accent/50 rounded-lg">
                        <span>Grupprum – inställningar och länkar</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="p-3 pt-2 space-y-4 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Fyll i dessa fält endast för lokaler av typen grupprum. Lämna tomt för övriga lokaler.
                        </p>
                        <Field label="Bokningsrumsnummer (för grupprum)">
                          <input
                            value={form.booking_room_number}
                            onChange={(e) => setForm({ ...form, booking_room_number: e.target.value.replace(/[^0-9]/g, "") })}
                            inputMode="numeric"
                            placeholder="t.ex. 4"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                          />
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            Rumsnummer (1–21) i KTH:s bokningssystem. När det matchar visas en indikator på kortet om grupprummet är <strong>ledigt</strong> eller <strong>upptaget</strong> just nu.
                          </p>
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Länk till boka grupprum – SV (group_booking_url)">
                            <input
                              type="url"
                              value={form.group_booking_url}
                              onChange={(e) => setForm({ ...form, group_booking_url: e.target.value })}
                              placeholder="https://apps.lib.kth.se/mrbsgrupprum/day.php?area=1"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Permanent länk till bokningssidan (visas alltid på kortet).
                            </p>
                          </Field>
                          <Field label="Link to book group room – EN (group_booking_url_en)">
                            <input
                              type="url"
                              value={form.group_booking_url_en}
                              onChange={(e) => setForm({ ...form, group_booking_url_en: e.target.value })}
                              placeholder="https://... (lämna tomt för att använda svenska som fallback)"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                          <Field label='Länk till "Boka nu" (ledigt grupprum) – SV (book_now_url)'>
                            <input
                              type="text"
                              value={form.book_now_url}
                              onChange={(e) => setForm({ ...form, book_now_url: e.target.value })}
                              placeholder="https://apps.lib.kth.se/mrbsgrupprum/edit_entry.php?area=1&room={room}&hour={hour}&minute=0&year={year}&month={month}&day={day}"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Mall som används när "Boka nu"-knappen visas. Platshållare:
                              <code className="ml-1">{"{room}"}</code>,
                              <code className="ml-1">{"{year}"}</code>,
                              <code className="ml-1">{"{month}"}</code>,
                              <code className="ml-1">{"{day}"}</code>,
                              <code className="ml-1">{"{hour}"}</code>,
                              <code className="ml-1">{"{minute}"}</code>.
                            </p>
                          </Field>
                          <Field label='Link to "Book now" (free group room) – EN (book_now_url_en)'>
                            <input
                              type="text"
                              value={form.book_now_url_en}
                              onChange={(e) => setForm({ ...form, book_now_url_en: e.target.value })}
                              placeholder="https://... (lämna tomt för att använda svenska som fallback)"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                        </div>
                      </div>
                    </details>


                    <details className="rounded-lg border border-border bg-muted/30 group">
                      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold flex items-center justify-between hover:bg-accent/50 rounded-lg">
                        <span>Bilder & alt-texter (max {MAX_IMAGES}, första är primär)</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="p-3 pt-2 space-y-3 border-t border-border">
                        {form.images.length > 0 && (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImagesDragEnd}>
                            <SortableContext
                              items={form.images.map((u, i) => `${i}::${u}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              <ul className="space-y-3">
                                {form.images.map((url, i) => (
                                  <SortableImageRow
                                    key={`${i}::${url}`}
                                    id={`${i}::${url}`}
                                    url={url}
                                    index={i}
                                    altSv={form.image_alts[i] ?? ""}
                                    altEn={form.image_alts_en[i] ?? ""}
                                    uploadedAt={imageDates[url]}
                                    onAltSv={(v) => setAlt(i, v)}
                                    onAltEn={(v) => setAltEn(i, v)}
                                    onRemove={() => removeImage(i)}
                                  />
                                ))}
                              </ul>
                            </SortableContext>
                          </DndContext>
                        )}

                        <div className="flex items-center gap-3 flex-wrap">
                          <label className={cn(
                            "inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                            form.images.length >= MAX_IMAGES && "opacity-50 cursor-not-allowed"
                          )}>
                            <Upload className="h-4 w-4" />
                            <span>Ladda upp bild</span>
                            <input
                              type="file" accept="image/webp,.webp" className="hidden"
                              disabled={form.images.length >= MAX_IMAGES}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            <strong>Format:</strong> WebP (.webp). <strong>Storlek:</strong> 1600×1067 px
                            i <strong>3:2-format</strong> (liggande). <strong>Max filstorlek:</strong> 250 kB.
                            På desktop visas bilden större och sträcks ut i höjd vid sidan av texten,
                            så håll motivet väl centrerat — kanterna kan beskäras lätt i topp/botten beroende
                            på hur mycket text kortet innehåller. Upp till {MAX_IMAGES} bilder per lokal.
                            Konvertera JPG/PNG till WebP med t.ex. <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className="underline">squoosh.app</a> innan uppladdning.
                          </p>
                        </div>
                      </div>
                    </details>

                    {categories.filter((c) => c.key !== "intent").map((cat) => (
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

            {selectedIds.size > 0 && (
              <div className="bg-accent/40 border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedIds.size} markerad{selectedIds.size === 1 ? "" : "e"}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >Avmarkera</button>
                <div className="flex-1" />
                <select
                  value={bulkAction}
                  onChange={(e) => { setBulkAction(e.target.value as BulkAction); setBulkValue(""); }}
                  aria-label="Bulk-åtgärd"
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                >
                  {BULK_ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
                {(bulkAction === "add_filter" || bulkAction === "remove_filter") ? (
                  <>
                    <select
                      value={bulkCategory}
                      onChange={(e) => { setBulkCategory(e.target.value); setBulkValue(""); }}
                      aria-label="Filterkategori"
                      className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    >
                      {categories
                        .filter((c) => c.key !== "vaningsplan")
                        .map((c) => (
                          <option key={c.id} value={c.key}>{c.title}</option>
                        ))}
                    </select>
                    <select
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      aria-label="Värde"
                      className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm min-w-[10rem]"
                    >
                      <option value="">— välj värde —</option>
                      {(byKey[bulkCategory] ?? []).map((o) => (
                        <option key={o.id} value={o.label}>{o.label}</option>
                      ))}
                    </select>
                  </>
                ) : BULK_ACTIONS.find((a) => a.value === bulkAction)?.needsValue && (
                  <input
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    placeholder={BULK_ACTIONS.find((a) => a.value === bulkAction)?.placeholder ?? ""}
                    aria-label={BULK_ACTIONS.find((a) => a.value === bulkAction)?.placeholder ?? "Värde"}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm min-w-[12rem]"
                  />
                )}
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={applyBulk}
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >{bulkBusy ? "Uppdaterar..." : "Tillämpa"}</button>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Laddar...</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSpacesDragEnd}>
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-left">
                        <th className="px-2 py-3 w-8">
                          <input
                            type="checkbox"
                            aria-label="Markera alla"
                            checked={spaces.length > 0 && selectedIds.size === spaces.length}
                            ref={(el) => {
                              if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < spaces.length;
                            }}
                            onChange={(e) => { if (e.target.checked) selectAll(); else clearSelection(); }}
                          />
                        </th>
                        <th className="px-2 py-3 w-8"></th>
                        <th className="px-4 py-3 font-semibold">Namn</th>
                        <th className="px-4 py-3 font-semibold hidden lg:table-cell">Slug</th>
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">Våning</th>
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">Lokaltyp</th>
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">Ljudnivå</th>
                        <th className="px-4 py-3 font-semibold">Innehåll</th>
                        <th className="px-4 py-3 font-semibold text-right">Åtgärder</th>
                      </tr>
                    </thead>
                    <SortableContext items={spaces.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <tbody>
                        {spaces.map((s) => (
                          <SortableSpaceRow
                            key={s.id}
                            space={s}
                            selected={selectedIds.has(s.id)}
                            onToggleSelected={() => toggleSelected(s.id)}
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

          <TabsContent value="occupancy">
            <OccupancySettingsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </main>
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
          {options.map((o) => {
            const active = values[0] === o.label;
            return (
              <button
                key={o.id} type="button"
                onClick={() => onChange(active ? [] : [o.label])}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary border-transparent"
                )}
              >
                <OptionIcon option={o} className="h-4 w-4" /> {o.label}
              </button>
            );
          })}
        </div>
      </Field>
    );
  }

  const toggle = (label: string) =>
    onChange(values.includes(label) ? values.filter((x) => x !== label) : [...values, label]);

  return (
    <Field label={cat.title}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o.label);
          return (
            <button
              key={o.id} type="button" onClick={() => toggle(o.label)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-transparent"
              )}
            >
              <OptionIcon option={o} className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
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

  const editableCategories = categories.filter((c) => c.key !== "intent");

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

      <div className="bg-muted/40 rounded-2xl border border-dashed border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-base">Jag vill arbeta</h3>
          <span className="text-xs rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">Systemstyrd</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Dessa val är inbyggda i studentvyn och kan inte redigeras här. Använd lokal-redigeraren för att markera vilka arbetssätt varje lokal passar för.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Enskilt", "Tillsammans", "I grupprum"].map((label) => (
            <span key={label} className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm">
              {label}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          När <strong>I grupprum</strong> är vald visas även gruppstorlek (2–4 / 5+) automatiskt utifrån lokalens kapacitet.
        </p>
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
  const [titleEn, setTitleEn] = useState(category?.title_en ?? "");
  const [style, setStyle] = useState<"list" | "pills">(category?.style ?? "pills");
  const [matchMode, setMatchMode] = useState<"any" | "all">(category?.match_mode ?? "any");
  const [isSingle, setIsSingle] = useState<boolean>(category?.is_single_select ?? false);

  const isNew = !category;


  const handleSave = async () => {
    try {
      const payload: any = { title: title.trim(), title_en: titleEn.trim() || null, style, match_mode: matchMode, is_single_select: isSingle };

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
  const [labelEn, setLabelEn] = useState(option?.label_en ?? "");
  const [iconUrl, setIconUrl] = useState<string | null>(option?.icon_url ?? null);
  const [defaultIcon, setDefaultIcon] = useState<string | null>(option?.default_icon ?? null);
  const [uploading, setUploading] = useState(false);
  const { data: hiddenIcons = [] } = useHiddenIcons();


  const save = useMutation({
    mutationFn: async () => {
      const newLabel = label.trim();
      const payload = {
        category: categoryKey, label: newLabel,
        label_en: labelEn.trim() || null,
        icon_url: iconUrl,
        default_icon: iconUrl ? null : defaultIcon,
      };

      if (option) {
        const oldLabel = option.label;
        const { error } = await supabase.from("filter_options").update(payload).eq("id", option.id);
        if (error) throw error;
        if (oldLabel && oldLabel !== newLabel) {
          const { error: rpcErr } = await supabase.rpc("rename_filter_option" as any, {
            p_category: categoryKey,
            p_old_label: oldLabel,
            p_new_label: newLabel,
          });
          if (rpcErr) throw rpcErr;
        }
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
              <div className="grid grid-cols-8 gap-1.5 max-h-72 overflow-y-auto rounded-md border border-border p-2">
                {LUCIDE_ICON_CHOICES.filter((n) => !hiddenIcons.includes(n)).map((name) => {
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
  const id = useId();
  const arr = Children.toArray(children);
  const onlyChild = arr.length === 1 ? arr[0] : null;
  const isFormControl =
    isValidElement(onlyChild) &&
    typeof onlyChild.type === "string" &&
    ["input", "textarea", "select"].includes(onlyChild.type);

  if (isFormControl) {
    const child = onlyChild as ReactElement<{ id?: string }>;
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium mb-1.5">{label}</label>
        {cloneElement(child, { id: child.props.id ?? id })}
      </div>
    );
  }

  // Group of controls — associate with an accessible name via role=group.
  const labelId = `${id}-label`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </div>
  );
}

type ContentField = {
  key: string;
  label: string;
  Icon: typeof Info;
  sv: string | null | undefined;
  en: string | null | undefined;
};

function ContentBadges({ space }: { space: Space }) {
  const fields: ContentField[] = [
    { key: "notice", label: "Tillfällig viktig information", Icon: AlertTriangle, sv: space.notice, en: space.notice_en },
    { key: "info", label: "Information på kortet", Icon: Info, sv: space.info, en: space.info_en },
    { key: "map", label: "Karta", Icon: MapPin, sv: space.map_url, en: space.map_url_en },
    { key: "booking", label: "Bokningsschema", Icon: CalendarClock, sv: space.booking_url, en: space.booking_url_en },
    { key: "group", label: "Boka grupprum", Icon: Users, sv: space.group_booking_url, en: space.group_booking_url_en },
    { key: "book", label: "Boka nu", Icon: Zap, sv: space.book_now_url, en: space.book_now_url_en },
  ];
  const imgCount = space.images?.length ?? 0;
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {fields.map((f) => {
        const hasSv = !!(f.sv && String(f.sv).trim());
        const hasEn = !!(f.en && String(f.en).trim());
        if (!hasSv && !hasEn) return null;
        const both = hasSv && hasEn;
        const svOnly = hasSv && !hasEn;
        const enOnly = !hasSv && hasEn;
        const title = both
          ? `${f.label}: SV + EN`
          : svOnly
            ? `${f.label}: endast SV (visas även på engelska kortet)`
            : `${f.label}: endast EN`;
        const cls = both
          ? "bg-primary/15 text-primary border-primary/30"
          : svOnly
            ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
            : "bg-secondary text-foreground border-border";
        return (
          <span
            key={f.key}
            title={title}
            aria-label={title}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium",
              cls,
            )}
          >
            <f.Icon className="h-3 w-3" aria-hidden="true" />
            <span className="tabular-nums">
              {both ? "SV·EN" : svOnly ? "SV" : "EN"}
            </span>
          </span>
        );
      })}
      {imgCount > 0 && (
        <span
          title={`${imgCount} foto${imgCount === 1 ? "" : "n"} inlagda`}
          aria-label={`${imgCount} foton inlagda`}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 text-primary px-1.5 py-0.5 text-[11px] font-medium"
        >
          <ImageIcon className="h-3 w-3" aria-hidden="true" />
          <span className="tabular-nums">{imgCount}</span>
        </span>
      )}
    </div>
  );
}

function SortableSpaceRow({
  space, selected, onToggleSelected, onEdit, onDelete,
}: {
  space: Space;
  selected: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: space.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className={cn("border-t border-border", selected ? "bg-accent/40" : "bg-card")}>
      <td className="px-2 py-3">
        <input
          type="checkbox"
          aria-label={`Markera ${space.name}`}
          checked={selected}
          onChange={onToggleSelected}
        />
      </td>
      <td className="px-2 py-3 text-muted-foreground">
        <button
          {...attributes} {...listeners}
          type="button"
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Dra för att flytta ${space.name}`}
        ><GripVertical className="h-4 w-4" aria-hidden="true" /></button>
      </td>
      <td className="px-4 py-3 font-medium">{space.name}</td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
        {space.slug ? (
          <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">{space.slug}</code>
        ) : (
          <span className="text-xs italic">— (ingen slug)</span>
        )}

      </td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.floor ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.lokaltyp?.join(", ") || "—"}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{space.noise}</td>
      <td className="px-4 py-3"><ContentBadges space={space} /></td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Redigera ${space.name}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ta bort ${space.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SortableImageRow({
  id, url, index, altSv, altEn, uploadedAt, onAltSv, onAltEn, onRemove,
}: {
  id: string; url: string; index: number;
  altSv: string; altEn: string; uploadedAt?: string | null;
  onAltSv: (v: string) => void; onAltEn: (v: string) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const dateLabel = uploadedAt
    ? new Date(uploadedAt).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" })
    : null;
  const altSvId = useId();
  const altEnId = useId();
  return (
    <li ref={setNodeRef} style={style} className="flex gap-3 items-start rounded-lg border border-border p-2 bg-card">
      <button
        type="button"
        {...attributes} {...listeners}
        className="min-h-11 min-w-11 inline-flex items-center justify-center self-center text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Dra för att flytta bild ${index + 1}`}
      ><GripVertical className="h-4 w-4" aria-hidden="true" /></button>
      <div className="relative shrink-0">
        <img src={url} alt="" className="h-20 w-28 object-cover border border-border" />
        {index === 0 && (
          <span className="absolute top-1 left-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded px-1.5 py-0.5">
            Primär
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <label htmlFor={altSvId} className="sr-only">Alt-text på svenska för bild {index + 1}</label>
          <input
            id={altSvId}
            value={altSv}
            onChange={(e) => onAltSv(e.target.value)}
            placeholder="Alt-text SV (beskriv bilden för skärmläsare)"
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label htmlFor={altEnId} className="sr-only">Alt text in English for image {index + 1}</label>
          <input
            id={altEnId}
            value={altEn}
            onChange={(e) => onAltEn(e.target.value)}
            placeholder="Alt text EN (describe the image for screen readers – leave blank to fall back to Swedish)"
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center justify-between">
          {dateLabel ? (
            <span className="text-[10px] text-muted-foreground">Uppladdad: {dateLabel}</span>
          ) : (
            <span />
          )}
          <button
            type="button" onClick={onRemove}
            className="min-h-11 min-w-11 rounded bg-destructive/10 text-destructive inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ta bort bild ${index + 1}`}
          ><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </div>
      </div>
    </li>
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
          type="button"
          className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Dra för att flytta ${option.label}`}
        ><GripVertical className="h-4 w-4" aria-hidden="true" /></button>
        <span className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <OptionIcon option={option} className="h-4 w-4" />
        </span>
        <span className="text-sm truncate">{option.label}</span>
      </div>
      <div className="inline-flex gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Redigera ${option.label}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Ta bort ${option.label}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

// ---------------- Card Layout Tab ----------------

const DUMMY_SPACE: Space = {
  id: "dummy",
  slug: null,
  name: "Exempel-lokal",
  space_kind: "study",
  category: "",
  description:
    "Detta är en förhandsvisning. Ändringar i listan här bredvid uppdaterar ordningen på sektionerna i alla lokalkort i studentvyn.",
  intent: [],
  noise: ["Samtalston"],
  equipment: ["Whiteboard", "Datorer"],
  facilities: ["Dagsljus", "Mat tillåten"],
  lokaltyp: ["Studieplats"],
  image_url: null,
  images: [],
  image_alts: [],
  image_alts_en: [],
  map_url: "#",
  map_url_en: null,
  booking_url: "#",
  booking_url_en: null,
  group_booking_url: "#",
  group_booking_url_en: null,
  book_now_url: null,
  book_now_url_en: null,
  sort_order: 0,
  floor: "Plan 3",
  located_in: "Biblioteket",
  capacity: 24,
  tags: {},
  notice: "Exempel på varningsruta – t.ex. tillfälligt stängt eller ombyggnation.",
  name_en: null,
  description_en: null,
  floor_en: null,
  located_in_en: null,
  notice_en: null,
  info: "Exempel på informationsruta – t.ex. öppettider eller praktisk info.",
  info_en: null,
  show_capacity_publicly: true,

  show_occupancy: true,
  countmatters_sensor_id: null,
  booking_room_number: null,
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

      <div className="space-y-6">
        <StudySpacePreviewCard order={order} />

        <GroupRoomPreviewCard order={order} />

        <CapacityIconSection />
      </div>
    </div>

  );
}

function StudySpacePreviewCard({ order }: { order: CardSectionKey[] }) {
  const [status, setStatus] = useState<"free" | "moderate" | "busy">("moderate");
  const level = status === "free" ? 1 : status === "moderate" ? 2 : 3;
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Förhandsvisning – studieplats
        </h3>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
          {(["free", "moderate", "busy"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full transition-colors ${status === s ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
            >
              {s === "free" ? "Gott om plats" : s === "moderate" ? "Halvfullt" : "Mycket folk"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[920px]">
        <SpaceCard
          space={DUMMY_SPACE}
          layoutOverride={order}
          previewOccupancy={{ level: level as 1 | 2 | 3, status }}
        />
      </div>
    </div>
  );
}

const DUMMY_GROUP_ROOM: Space = {
  ...DUMMY_SPACE,
  id: "dummy-group",
  name: "Grupprum 3001",
  category: "",
  description:
    "Exempel på grupprum. Här ser du hur kortet ser ut med statusbadge för ledigt/upptaget och knappen Boka nu.",
  lokaltyp: ["Grupprum"],
  noise: ["Samtalston"],
  equipment: ["Whiteboard", "Skärm"],
  facilities: ["Dagsljus"],
  floor: "Plan 3",
  located_in: "Biblioteket",
  capacity: 6,
  notice: null,
  info: null,
  group_booking_url: "#",
  book_now_url: "#",
  booking_room_number: 3001,
  show_occupancy: false,
};

function GroupRoomPreviewCard({ order }: { order: CardSectionKey[] }) {
  const [status, setStatus] = useState<"free" | "busy">("free");
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Förhandsvisning – grupprum
        </h3>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
          <button
            onClick={() => setStatus("free")}
            className={`px-3 py-1 rounded-full transition-colors ${status === "free" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
          >
            Ledigt (Boka nu)
          </button>
          <button
            onClick={() => setStatus("busy")}
            className={`px-3 py-1 rounded-full transition-colors ${status === "busy" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
          >
            Upptaget
          </button>
        </div>
      </div>
      <div className="max-w-[920px]">
        <SpaceCard
          space={DUMMY_GROUP_ROOM}
          layoutOverride={order}
          previewGroupRoom={{ status }}
        />
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

function LangPairEditor({
  labelSv,
  labelEn,
  rows,
  valueSv,
  valueEn,
  onSaveSv,
  onSaveEn,
  defaultSv,
  defaultEn,
  isPending,
  isLoading,
}: {
  labelSv: string;
  labelEn: string;
  rows: number;
  valueSv: string;
  valueEn: string;
  onSaveSv: (v: string) => void;
  onSaveEn: (v: string) => void;
  defaultSv?: string;
  defaultEn?: string;
  isPending: boolean;
  isLoading: boolean;
}) {
  const [sv, setSv] = useState(valueSv);
  const [en, setEn] = useState(valueEn);
  useEffect(() => setSv(valueSv), [valueSv]);
  useEffect(() => setEn(valueEn), [valueEn]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {labelSv} (SV)
        </label>
        <textarea
          rows={rows}
          value={sv}
          onChange={(e) => setSv(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSaveSv(sv)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Spara SV
          </button>
          {defaultSv !== undefined && (
            <button
              type="button"
              onClick={() => setSv(defaultSv)}
              className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Återställ
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {labelEn} (EN)
        </label>
        <textarea
          rows={rows}
          value={en}
          onChange={(e) => setEn(e.target.value)}
          disabled={isLoading}
          placeholder="Lämna tomt för att falla tillbaka till svenska."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSaveEn(en)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Spara EN
          </button>
          {defaultEn !== undefined && (
            <button
              type="button"
              onClick={() => setEn(defaultEn)}
              className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Återställ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LandingMessageTab() {
  const uiKeys: UiTextKey[] = ["empty_title", "empty_suggest_template", "empty_fallback", "show_description", "hide_description", "about_button", "occupancy_free", "occupancy_moderate", "occupancy_busy"];

  return (
    <div className="space-y-6 max-w-4xl">
      <AnnouncementSection />
      {uiKeys.map((k) => (
        <UiTextEditor key={k} uiKey={k} />
      ))}
    </div>
  );
}

function AnnouncementSection() {
  const { data, isLoading } = useAnnouncementAdmin();
  const save = useSaveAnnouncement();
  const [sv, setSv] = useState("");
  const [en, setEn] = useState("");

  useEffect(() => {
    if (data) {
      setSv(data.sv);
      setEn(data.en);
    }
  }, [data]);

  const enabled = data?.enabled ?? false;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Driftmeddelande på startsidan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visas som en banner högst upp på startsidan, direkt under sidhuvudet.
            Använd t.ex. för att informera om renovering eller större ändringar.
            Besökare kan stänga bannern, men den dyker upp igen om du redigerar texten.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium">{enabled ? "På" : "Av"}</span>
          <Switch
            checked={enabled}
            disabled={isLoading || save.isPending}
            onCheckedChange={(v) =>
              save.mutate(
                { enabled: v },
                { onSuccess: () => toast.success(v ? "Meddelande aktiverat" : "Meddelande avstängt") },
              )
            }
            aria-label="Visa driftmeddelande"
          />
        </div>
      </div>
      <LangPairEditor
        labelSv="Meddelande"
        labelEn="Message"
        rows={3}
        valueSv={sv}
        valueEn={en}
        isPending={save.isPending}
        isLoading={isLoading}
        onSaveSv={(v) =>
          save.mutate({ sv: v }, { onSuccess: () => toast.success("Sparat (SV)") })
        }
        onSaveEn={(v) =>
          save.mutate({ en: v }, { onSuccess: () => toast.success("Sparat (EN)") })
        }
      />
    </div>
  );
}

function UiTextEditor({ uiKey }: { uiKey: UiTextKey }) {
  const { data: pair, isLoading } = useUiTextAdmin(uiKey);
  const save = useSaveUiText();
  const meta = UI_TEXT_META[uiKey];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">{meta.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
      </div>
      <LangPairEditor
        labelSv={meta.title}
        labelEn={meta.title}
        rows={meta.rows ?? 3}
        valueSv={pair?.sv ?? ""}
        valueEn={pair?.en ?? ""}
        defaultSv={UI_TEXT_DEFAULTS[uiKey]}
        defaultEn={UI_TEXT_DEFAULTS_EN[uiKey]}
        isPending={save.isPending}
        isLoading={isLoading}
        onSaveSv={(v) =>
          save.mutate({ key: uiKey, value: v, lang: "sv" }, { onSuccess: () => toast.success("Sparat (SV)") })
        }
        onSaveEn={(v) =>
          save.mutate({ key: uiKey, value: v, lang: "en" }, { onSuccess: () => toast.success("Sparat (EN)") })
        }
      />
    </div>
  );
}


function CapacityIconSection() {
  const { data: iconUrl } = useCapacityIcon();
  const save = useSaveCapacityIcon();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `capacity-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("filter-icons").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("filter-icons").getPublicUrl(path);
      await save.mutateAsync(data.publicUrl);
      toast.success("Sittplatsikon uppdaterad");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Ikon för antal sittplatser</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visas bredvid antalet platser på alla lokalkort. Rekommenderat: kvadratisk
          SVG eller PNG (minst 64×64 px) med transparent bakgrund.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-md border border-border bg-secondary flex items-center justify-center">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <ChairIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {iconUrl ? "Egen ikon används." : "Standardikon används."}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 cursor-pointer">
          <Upload className="h-4 w-4" />
          {uploading ? "Laddar upp..." : "Ladda upp ikon"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {iconUrl && (
          <button
            type="button"
            onClick={() => save.mutate(null, { onSuccess: () => toast.success("Återställd till standard") })}
            className="inline-flex items-center gap-2 rounded-full bg-secondary text-foreground px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Återställ till standard
          </button>
        )}
      </div>
    </div>
  );
}


// ---------------- Occupancy Settings Tab ----------------

function OccupancySettingsTab() {
  const { data } = useOccupancySettings();
  const save = useSaveOccupancySettings();
  const [enabled, setEnabled] = useState<boolean>(true);
  const [schedule, setSchedule] = useState<OccupancySchedule>(DEFAULT_SCHEDULE);

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setSchedule(data.schedule);
    }
  }, [data]);

  const updateDay = (d: Weekday, patch: Partial<DaySchedule>) => {
    setSchedule((s) => ({ ...s, [d]: { ...s[d], ...patch } }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-1">Beläggningsindikator</h2>
        <p className="text-sm text-muted-foreground">
          Styr om realtidsbeläggningen ska visas i studentvyn och under vilka tider.
          Per-lokal kan beläggningen även slås av på respektive lokalkort.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border cursor-pointer accent-[var(--kth-blue)]"
          />
          <span>
            <span className="block text-sm font-medium">
              Visa beläggning för samtliga lokaler
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Slå av detta för att dölja beläggningsindikatorn på alla lokalkort samtidigt
              (t.ex. vid tekniska problem med Countmatters).
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Visningstider per veckodag</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Beläggningen visas bara inom angivet intervall. Stäng av dagar då biblioteket
            är stängt.
          </p>
        </div>
        <div className="space-y-2">
          {WEEKDAYS.map((d) => {
            const day = schedule[d];
            return (
              <div key={d} className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 w-32 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(d, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-border cursor-pointer accent-[var(--kth-blue)]"
                  />
                  <span className="text-sm">{WEEKDAY_LABELS_SV[d]}</span>
                </label>
                <input
                  type="time"
                  value={day.from}
                  disabled={!day.enabled}
                  onChange={(e) => updateDay(d, { from: e.target.value })}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm disabled:opacity-50"
                />
                <span className="text-sm text-muted-foreground">–</span>
                <input
                  type="time"
                  value={day.to}
                  disabled={!day.enabled}
                  onChange={(e) => updateDay(d, { to: e.target.value })}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm disabled:opacity-50"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save.mutate({ enabled, schedule }, {
            onSuccess: () => toast.success("Sparat"),
            onError: (e: any) => toast.error(e.message),
          })}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Sparar..." : "Spara"}
        </button>
        <button
          type="button"
          onClick={() => setSchedule(DEFAULT_SCHEDULE)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Återställ till standard
        </button>
      </div>
    </div>
  );
}


