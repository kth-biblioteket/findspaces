import { AnalyticsTab } from "@/components/AnalyticsTab";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { validateSpaceForm } from "@/lib/adminSpaceSchema";
import { processImageToWebp } from "@/lib/processImage";
import { type FilterOption, type Space } from "@/lib/spaces";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { groupOptionsByKey, useFilterOptions } from "@/lib/useFilterOptions";
import { cn } from "@/lib/utils";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Info, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DynamicCategoryField, Field, ImageDropzone, LinkSyntaxHelp, SelectByLokaltyp, SortableImageRow } from "@/components/admin/shared";
import { SortableSpaceRow } from "@/components/admin/SpaceListRow";
import { FiltersTab } from "@/components/admin/FiltersTab";
import { CardLayoutTab } from "@/components/admin/CardLayoutTab";
import { LandingMessageTab } from "@/components/admin/TextsTab";
import { OccupancySettingsTab } from "@/components/admin/OccupancyTab";
import { OpeningHoursTab } from "@/components/admin/OpeningHoursTab";
import { MAX_IMAGES, type BulkAction, BULK_ACTIONS, BULK_RICH_TEXT_ACTIONS, type FormState, emptyForm, spaceToForm, getFormValues, setFormValues } from "@/components/admin/adminForm";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — KTH Biblioteket" }] }),
  component: AdminPage,
});

const MAX_IMAGES = 8;

type BulkAction =
  | "set_description"
  | "clear_description"
  | "set_description_en"
  | "clear_description_en"
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
  | "show_occupancy_off";

const BULK_ACTIONS: { value: BulkAction; label: string; needsValue: boolean; placeholder?: string }[] = [
  { value: "set_description", label: "Sätt beskrivning (SV)", needsValue: true, placeholder: "Beskrivning på svenska" },
  { value: "clear_description", label: "Rensa beskrivning (SV)", needsValue: false },
  {
    value: "set_description_en",
    label: "Sätt beskrivning (EN)",
    needsValue: true,
    placeholder: "Description in English",
  },
  { value: "clear_description_en", label: "Rensa beskrivning (EN)", needsValue: false },
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
];

const BULK_RICH_TEXT_ACTIONS: BulkAction[] = [
  "set_description",
  "set_description_en",
  "set_notice",
  "set_notice_en",
  "set_info",
  "set_info_en",
];


type FormState = {
  id?: string;
  space_kind: string;
  slug: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  description_inline: boolean;
  floor: string;
  floor_en: string;
  located_in: string;
  located_in_en: string;
  capacity: string;
  computer_count: string;
  informal_seat_count: string;
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
  group_booking_label: string;
  group_booking_label_en: string;
  book_now_url: string;
  book_now_url_en: string;
  notice: string;
  notice_en: string;
  info: string;
  info_en: string;
  sort_order: number;
};

const emptyForm: FormState = {
  space_kind: "study",
  slug: "",
  name: "",
  name_en: "",
  description: "",
  description_en: "",
  description_inline: false,
  floor: "",
  floor_en: "",
  located_in: "",
  located_in_en: "",
  capacity: "",
  computer_count: "",
  informal_seat_count: "",
  show_capacity_publicly: false,
  show_occupancy: true,
  countmatters_sensor_id: "",
  booking_room_number: "",
  intent: [],
  noise: [],
  equipment: [],
  facilities: [],
  lokaltyp: [],
  tags: {},
  images: [],
  image_alts: [],
  image_alts_en: [],
  map_url: "",
  map_url_en: "",
  booking_url: "",
  booking_url_en: "",
  group_booking_url: "",
  group_booking_url_en: "",
  group_booking_label: "",
  group_booking_label_en: "",
  book_now_url: "",
  book_now_url_en: "",
  notice: "",
  notice_en: "",
  info: "",
  info_en: "",
  sort_order: 999,
};

function spaceToForm(s: Space): FormState {
  const images = s.images && s.images.length > 0 ? s.images : s.image_url ? [s.image_url] : [];
  const image_alts = (s.image_alts ?? []).slice(0, images.length);
  while (image_alts.length < images.length) image_alts.push("");
  const image_alts_en = (s.image_alts_en ?? []).slice(0, images.length);
  while (image_alts_en.length < images.length) image_alts_en.push("");
  return {
    id: s.id,
    space_kind: s.space_kind ?? "study",
    slug: s.slug ?? "",
    name: s.name,
    name_en: s.name_en ?? "",
    description: s.description,
    description_en: s.description_en ?? "",
    description_inline: s.description_inline ?? false,
    floor: s.floor ?? "",
    floor_en: s.floor_en ?? "",
    located_in: s.located_in ?? "",
    located_in_en: s.located_in_en ?? "",
    capacity: s.capacity != null ? String(s.capacity) : "",
    computer_count: s.computer_count != null ? String(s.computer_count) : "",
    informal_seat_count: s.informal_seat_count != null ? String(s.informal_seat_count) : "",
    show_capacity_publicly: s.show_capacity_publicly ?? false,
    show_occupancy: s.show_occupancy ?? true,
    countmatters_sensor_id: s.countmatters_sensor_id ?? "",
    booking_room_number: s.booking_room_number != null ? String(s.booking_room_number) : "",
    intent: s.intent ?? [],
    noise: s.noise ?? [],
    equipment: s.equipment ?? [],
    facilities: s.facilities ?? [],
    lokaltyp: s.lokaltyp ?? [],
    tags: (s.tags ?? {}) as Record<string, string[]>,
    images,
    image_alts,
    image_alts_en,
    map_url: s.map_url ?? "",
    map_url_en: s.map_url_en ?? "",
    booking_url: s.booking_url ?? "",
    booking_url_en: s.booking_url_en ?? "",
    group_booking_url: s.group_booking_url ?? "",
    group_booking_url_en: s.group_booking_url_en ?? "",
    group_booking_label: s.group_booking_label ?? "",
    group_booking_label_en: s.group_booking_label_en ?? "",
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
    case "intent":
      return form.intent;
    case "noise":
      return form.noise;
    case "equipment":
      return form.equipment;
    case "facility":
      return form.facilities;
    case "lokaltyp":
      return form.lokaltyp;
    default:
      return form.tags[key] ?? [];
  }
}

function setFormValues(form: FormState, key: string, values: string[]): FormState {
  switch (key) {
    case "intent":
      return { ...form, intent: values };
    case "noise":
      return { ...form, noise: values };
    case "equipment":
      return { ...form, equipment: values };
    case "facility":
      return { ...form, facilities: values };
    case "lokaltyp":
      return { ...form, lokaltyp: values };
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
  const [originalForm, setOriginalForm] = useState<FormState>(emptyForm);
  const [editTab, setEditTab] = useState<"basic" | "filter" | "text" | "media" | "advanced">("basic");
  const [imageDates, setImageDates] = useState<Record<string, string | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("set_floor");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkAccess = async (session: { user: { id: string; email?: string | null } } | null) => {
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!mounted) return;
      if (error || !isAdmin) {
        toast.error("Saknar admin-behörighet");
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }
      setUserEmail(session.user.email ?? null);
      setAuthChecked(true);
    };
    supabase.auth.getSession().then(({ data }) => {
      void checkAccess(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
      else void checkAccess(session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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
          supabase
            .from("spaces")
            .update({ sort_order: (i + 1) * 10 })
            .eq("id", s.id),
        ),
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  // Read the two special categories from DB so their labels/icons/order
  // (edited from the Filters tab) drive the space editor's own pickers.
  const spaceKindCat = categories.find((c) => c.special_kind === "space_kind");
  const arbetssattCat = categories.find((c) => c.special_kind === "arbetssatt");
  const spaceKindOptions: FilterOption[] = (spaceKindCat ? (byKey[spaceKindCat.key] ?? []) : []).filter(
    (o) => !o.hidden && o.value_key,
  );
  const arbetssattOptions: FilterOption[] = (arbetssattCat ? (byKey[arbetssattCat.key] ?? []) : []).filter(
    (o) => !o.hidden && o.value_key,
  );

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const capNum = f.capacity.trim() ? parseInt(f.capacity, 10) : NaN;
      const compNum = f.computer_count.trim() ? parseInt(f.computer_count, 10) : NaN;
      const informalNum = f.informal_seat_count.trim() ? parseInt(f.informal_seat_count, 10) : NaN;
      const payload: any = {
        space_kind: f.space_kind,
        slug: f.slug.trim() ? f.slug.trim().toLowerCase() : null,
        name: f.name,
        name_en: f.name_en.trim() || null,
        description: f.description,
        description_en: f.description_en.trim() || null,
        description_inline: f.description_inline,
        floor: f.floor?.trim() ? f.floor.trim() : null,
        floor_en: f.floor_en?.trim() ? f.floor_en.trim() : null,
        located_in: f.located_in?.trim() ? f.located_in.trim() : null,
        located_in_en: f.located_in_en?.trim() ? f.located_in_en.trim() : null,
        capacity: Number.isFinite(capNum) ? capNum : null,
        computer_count: Number.isFinite(compNum) ? compNum : null,
        informal_seat_count: Number.isFinite(informalNum) ? informalNum : null,
        show_capacity_publicly: f.show_capacity_publicly,
        show_occupancy: f.show_occupancy,
        countmatters_sensor_id: f.countmatters_sensor_id.trim() || null,
        booking_room_number: f.booking_room_number.trim() ? Number.parseInt(f.booking_room_number, 10) || null : null,
        intent: f.intent,
        noise: f.noise,
        equipment: f.equipment,
        facilities: f.facilities,
        lokaltyp: f.lokaltyp,
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
        group_booking_label: f.group_booking_label.trim() || null,
        group_booking_label_en: f.group_booking_label_en.trim() || null,
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
      setOpen(false);
      setForm(emptyForm);
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

  const toggleHidden = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase
        .from("spaces")
        .update({ hidden } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["spaces"] });
      toast.success(vars.hidden ? "Lokalen är dold" : "Lokalen är synlig igen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = () => setSelectedIds(new Set(spaces.map((s) => s.id)));

  const [bulkCategory, setBulkCategory] = useState<string>("lokaltyp");

  // List UI state (persisted in localStorage) — search, filters, compact view.
  const [listQuery, setListQuery] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("admin.spaces.query") ?? "";
  });
  const [listKind, setListKind] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return window.localStorage.getItem("admin.spaces.kind") ?? "all";
  });
  const [listVisibility, setListVisibility] = useState<"all" | "visible" | "hidden">(() => {
    if (typeof window === "undefined") return "all";
    const v = window.localStorage.getItem("admin.spaces.visibility");
    return v === "visible" || v === "hidden" ? v : "all";
  });
  const [listLokaltyp, setListLokaltyp] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return window.localStorage.getItem("admin.spaces.lokaltyp") ?? "all";
  });
  const [listCompact, setListCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin.spaces.compact") === "1";
  });
  useEffect(() => {
    window.localStorage.setItem("admin.spaces.query", listQuery);
  }, [listQuery]);
  useEffect(() => {
    window.localStorage.setItem("admin.spaces.kind", listKind);
  }, [listKind]);
  useEffect(() => {
    window.localStorage.setItem("admin.spaces.visibility", listVisibility);
  }, [listVisibility]);
  useEffect(() => {
    window.localStorage.setItem("admin.spaces.lokaltyp", listLokaltyp);
  }, [listLokaltyp]);
  useEffect(() => {
    window.localStorage.setItem("admin.spaces.compact", listCompact ? "1" : "0");
  }, [listCompact]);

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
          case "set_description":
            return { description: val };
          case "clear_description":
            return { description: "" };
          case "set_description_en":
            return { description_en: val };
          case "clear_description_en":
            return { description_en: null };
          case "set_floor":
            return { floor: val };
          case "set_floor_en":
            return { floor_en: val };
          case "set_notice":
            return { notice: val };
          case "clear_notice":
            return { notice: null };
          case "set_notice_en":
            return { notice_en: val };
          case "clear_notice_en":
            return { notice_en: null };
          case "set_info":
            return { info: val };
          case "clear_info":
            return { info: null };
          case "set_info_en":
            return { info_en: val };
          case "clear_info_en":
            return { info_en: null };
          case "show_occupancy_on":
            return { show_occupancy: true };
          case "show_occupancy_off":
            return { show_occupancy: false };
          default:
            return null;
        }
      })();

      if (simple) {
        const { error } = await supabase
          .from("spaces")
          .update(simple as any)
          .in("id", ids);
        if (error) throw error;
      } else if (bulkAction === "add_filter" || bulkAction === "remove_filter") {
        const cat = bulkCategory;
        if (cat === "vaningsplan") {
          throw new Error("Använd 'Sätt våningsplan' för plan");
        }
        // Map category key to spaces column (or tags JSON)
        const colMap: Record<string, string> = {
          intent: "intent",
          arbetssatt: "intent",
          noise: "noise",
          equipment: "equipment",
          facility: "facilities",
          lokaltyp: "lokaltyp",
        };
        const col = colMap[cat];
        await Promise.all(
          selectedSpaces.map((s) => {
            if (col) {
              const cur = Array.isArray((s as any)[col]) ? ((s as any)[col] as string[]) : [];
              const next =
                bulkAction === "add_filter" ? (cur.includes(val) ? cur : [...cur, val]) : cur.filter((x) => x !== val);
              return supabase
                .from("spaces")
                .update({ [col]: next } as any)
                .eq("id", s.id);
            } else {
              const tags =
                s.tags && typeof s.tags === "object" && !Array.isArray(s.tags)
                  ? { ...(s.tags as Record<string, string[]>) }
                  : {};
              const cur = Array.isArray(tags[cat]) ? tags[cat] : [];
              const next =
                bulkAction === "add_filter" ? (cur.includes(val) ? cur : [...cur, val]) : cur.filter((x) => x !== val);
              if (next.length === 0) delete tags[cat];
              else tags[cat] = next;
              return supabase
                .from("spaces")
                .update({ tags: tags as any })
                .eq("id", s.id);
            }
          }),
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

  const [uploadBusy, setUploadBusy] = useState(false);

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("Ingen bildfil hittades");
      return;
    }
    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_IMAGES} bilder.`);
      return;
    }
    const batch = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(`Endast ${remaining} av ${files.length} bilder laddades upp (max ${MAX_IMAGES}).`);
    }

    setUploadBusy(true);
    try {
      for (const file of batch) {
        try {
          const processed = await processImageToWebp(file);
          const path = `${crypto.randomUUID()}.webp`;
          const { error } = await supabase.storage
            .from("space-images")
            .upload(path, processed.file, { contentType: "image/webp" });
          if (error) {
            toast.error(`${file.name}: ${error.message}`);
            continue;
          }
          const { data } = supabase.storage.from("space-images").getPublicUrl(path);
          const nowIso = new Date().toISOString();
          setForm((f) => ({
            ...f,
            images: [...f.images, data.publicUrl],
            image_alts: [...f.image_alts, ""],
            image_alts_en: [...f.image_alts_en, ""],
          }));
          setImageDates((prev) => ({ ...prev, [data.publicUrl]: nowIso }));
        } catch (e: any) {
          toast.error(`${file.name}: ${e?.message ?? "kunde inte bearbetas"}`);
        }
      }
      toast.success(batch.length === 1 ? "Bild uppladdad" : `${batch.length} bilder uppladdade`);
    } finally {
      setUploadBusy(false);
    }
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
    setOriginalForm(f);
    setImageDates({});
    setEditTab("basic");
    setOpen(true);
    fetchImageDates(f.images);
  };
  const openNew = () => {
    setForm(emptyForm);
    setOriginalForm(emptyForm);
    setImageDates({});
    setEditTab("basic");
    setOpen(true);
  };
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(originalForm), [form, originalForm]);

  // Client-side validation of the space form (numbers, links, required fields).
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const handleSave = () => {
    const errors = validateSpaceForm(form as unknown as Record<string, unknown>);
    setFormErrors(errors);
    if (errors.length > 0) {
      toast.error("Kontrollera fälten innan du sparar.");
      return;
    }
    save.mutate(form);
  };
  // Guard against losing edits when the dialog is dismissed by mistake.
  const handleDialogOpenChange = (next: boolean) => {
    if (!next && isDirty && !save.isPending) {
      const discard = window.confirm("Du har ändringar som inte är sparade. Vill du stänga ändå?");
      if (!discard) return;
    }
    if (!next) setFormErrors([]);
    setOpen(next);
  };



  useEffect(() => {
    if (open && form.images.length > 0) {
      fetchImageDates(form.images);
    }
  }, [open, form.images.length, fetchImageDates]);

  // Filtered spaces for the admin list — search + kind + visibility + lokaltyp.
  const listFiltersActive =
    listQuery.trim() !== "" || listKind !== "all" || listVisibility !== "all" || listLokaltyp !== "all";
  const filteredSpaces = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return spaces.filter((s) => {
      if (listKind !== "all" && (s.space_kind ?? "study") !== listKind) return false;
      if (listVisibility === "visible" && s.hidden) return false;
      if (listVisibility === "hidden" && !s.hidden) return false;
      if (listLokaltyp !== "all" && !(s.lokaltyp ?? []).includes(listLokaltyp)) return false;
      if (q) {
        const hay = [s.name, s.name_en ?? "", s.slug ?? "", s.floor ?? "", s.located_in ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [spaces, listQuery, listKind, listVisibility, listLokaltyp]);

  if (!authChecked) {
    return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Laddar...</div>;
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          <h1 className="text-base font-semibold leading-tight text-[var(--kth-navy)]">Admin — Studieplatser</h1>
          <div className="flex items-center gap-3">
            {userEmail && <span className="hidden sm:inline text-xs text-muted-foreground">{userEmail}</span>}
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Logga ut
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
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
            <TabsTrigger value="landing">Texter</TabsTrigger>
            
            <TabsTrigger value="layout">Kortlayout</TabsTrigger>
            <TabsTrigger value="occupancy">Beläggning</TabsTrigger>
            <TabsTrigger value="hours">Öppettider</TabsTrigger>
            <TabsTrigger value="analytics">Statistik</TabsTrigger>
          </TabsList>

          <TabsContent value="spaces" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Alla lokaler/ytor{" "}
                <span className="text-muted-foreground font-normal">
                  ({listFiltersActive ? `${filteredSpaces.length} av ${spaces.length}` : spaces.length})
                </span>
              </h2>
              <Dialog open={open} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <button
                    onClick={openNew}
                    className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Ny lokal
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                  <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2 flex-wrap text-lg">
                      <span>{form.id ? "Redigera lokal" : "Ny lokal"}</span>
                      {form.name && <span className="text-muted-foreground font-normal">— {form.name}</span>}
                      {form.id && form.id && spaces.find((s) => s.id === form.id)?.hidden && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-normal">
                          Dold
                        </span>
                      )}
                      {isDirty && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-normal">
                          Osparade ändringar
                        </span>
                      )}
                    </DialogTitle>
                  </DialogHeader>

                  <Tabs
                    value={editTab}
                    onValueChange={(v) => setEditTab(v as typeof editTab)}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="px-6 pt-3 shrink-0 border-b border-border overflow-x-auto">
                      <TabsList className="bg-transparent p-0 h-auto gap-1">
                        <TabsTrigger
                          value="basic"
                          className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                          Grund
                        </TabsTrigger>
                        <TabsTrigger
                          value="filter"
                          className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                          Filter
                        </TabsTrigger>
                        <TabsTrigger
                          value="text"
                          className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                          Texter
                        </TabsTrigger>
                        <TabsTrigger
                          value="media"
                          className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                          Bilder & länkar
                        </TabsTrigger>
                        <TabsTrigger
                          value="advanced"
                          className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                          Avancerat
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
                      <TabsContent value="basic" className="mt-0 space-y-5 focus-visible:outline-none">
                        <Field
                          label={
                            spaceKindCat ? `${spaceKindCat.title} (vad letar besökaren efter?)` : "Vad letar du efter?"
                          }
                        >
                          <div className="flex flex-wrap gap-2">
                            {spaceKindOptions.map((o) => {
                              const key = o.value_key ?? "";
                              const active = form.space_kind === key;
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => setForm({ ...form, space_kind: key })}
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-sm transition",
                                    active
                                      ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                                      : "bg-card text-foreground border-border hover:bg-accent",
                                  )}
                                >
                                  {o.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Service- och skapandelokaler visas i egna flikar i studentvyn – utan beläggning, bokning
                            eller ljudnivå.
                          </p>
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              placeholder="Lämna tomt = SV fallback"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                        </div>

                        <Field label="Kort-ID / slug (valfritt)">
                          <input
                            value={form.slug}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                slug: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, "-")
                                  .replace(/-+/g, "-"),
                              })
                            }
                            placeholder="t.ex. maxwell eller norra-arkaden"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Kort, läsbart ID som används i interna länkar och delbara URL:er. Endast små bokstäver,
                            siffror och bindestreck.
                            {form.slug && (
                              <>
                                {" "}
                                Länksyntax:{" "}
                                <code className="bg-secondary px-1 py-0.5 rounded">[[{form.slug}|valfri text]]</code>
                                {" · "}Direktlänk:{" "}
                                <code className="bg-secondary px-1 py-0.5 rounded">?highlight={form.slug}</code>
                              </>
                            )}
                          </p>
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

                        <div>
                          <div className="text-sm font-medium mb-2">Antal platser</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="Studieplatser (bord + stol)">
                              <input
                                type="number"
                                min={1}
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                placeholder="t.ex. 4"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label="Nedslagsplatser (fåtöljer, soffor)">
                              <input
                                type="number"
                                min={1}
                                value={form.informal_seat_count}
                                onChange={(e) => setForm({ ...form, informal_seat_count: e.target.value })}
                                placeholder="t.ex. 6"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label="Datorplatser">
                              <input
                                type="number"
                                min={1}
                                value={form.computer_count}
                                onChange={(e) => setForm({ ...form, computer_count: e.target.value })}
                                placeholder="t.ex. 3"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Lämna tomt om typen inte finns i lokalen. Fyllda värden visas automatiskt på lokalkortet.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="filter" className="mt-0 space-y-5 focus-visible:outline-none">
                        <Field
                          label={arbetssattCat ? `${arbetssattCat.title} (hur vill du arbeta?)` : "Hur vill du arbeta?"}
                        >
                          <div className="flex flex-wrap gap-2">
                            {arbetssattOptions.map((o) => {
                              const key = o.value_key ?? "";
                              const active = form.intent.includes(key);
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => {
                                    const next = active ? form.intent.filter((v) => v !== key) : [...form.intent, key];
                                    setForm({ ...form, intent: next });
                                  }}
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-sm transition",
                                    active
                                      ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                                      : "bg-card text-foreground border-border hover:bg-accent",
                                  )}
                                >
                                  {o.label}
                                </button>
                              );
                            })}
                          </div>
                        </Field>

                        {categories
                          .filter((c) => !c.special_kind)
                          .map((cat) => (
                            <DynamicCategoryField
                              key={cat.id}
                              cat={cat}
                              options={byKey[cat.key] ?? []}
                              values={getFormValues(form, cat.key)}
                              onChange={(values) => setForm(setFormValues(form, cat.key, values))}
                            />
                          ))}
                      </TabsContent>

                      <TabsContent value="text" className="mt-0 space-y-5 focus-visible:outline-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field
                            label={
                              <span className="flex items-center gap-2">
                                Beskrivning (SV) <LinkSyntaxHelp slug={form.slug} />
                              </span>
                            }
                          >
                            <textarea
                              rows={5}
                              value={form.description}
                              onChange={(e) => setForm({ ...form, description: e.target.value })}
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                            />
                          </Field>
                          <Field label="Description (EN)">
                            <textarea
                              rows={5}
                              value={form.description_en}
                              onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                              placeholder="Lämna tomt = SV fallback"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                            />
                          </Field>
                        </div>

                        <label className="flex items-start gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.description_inline}
                            onChange={(e) => setForm({ ...form, description_inline: e.target.checked })}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">Visa beskrivningen direkt på kortet</span>
                            <span className="block text-xs text-muted-foreground">
                              När ikryssad visas beskrivningen alltid på kortet istället för att gömmas bakom en i-ikon.
                            </span>
                          </span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field
                            label={
                              <span className="flex items-center gap-2">
                                Tillfällig notis, gul ruta (SV) <LinkSyntaxHelp slug={form.slug} />
                              </span>
                            }
                          >
                            <textarea
                              rows={2}
                              value={form.notice}
                              onChange={(e) => setForm({ ...form, notice: e.target.value })}
                              placeholder="Lämna tomt om ingen notis ska visas"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                          <Field label="Temporary notice, yellow (EN)">
                            <textarea
                              rows={2}
                              value={form.notice_en}
                              onChange={(e) => setForm({ ...form, notice_en: e.target.value })}
                              placeholder="Lämna tomt = SV fallback"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                          <Field
                            label={
                              <span className="flex items-center gap-2">
                                Information på kortet (SV) <LinkSyntaxHelp slug={form.slug} />
                              </span>
                            }
                          >
                            <textarea
                              rows={2}
                              value={form.info}
                              onChange={(e) => setForm({ ...form, info: e.target.value })}
                              placeholder='T.ex. "Möblerna är tillfälliga och byts ut under hösten."'
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                          <Field label="Info on the card (EN)">
                            <textarea
                              rows={2}
                              value={form.info_en}
                              onChange={(e) => setForm({ ...form, info_en: e.target.value })}
                              placeholder="Lämna tomt = SV fallback"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                            />
                          </Field>
                        </div>
                      </TabsContent>

                      <TabsContent value="media" className="mt-0 space-y-6 focus-visible:outline-none">
                        <section className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold">
                              Bilder ({form.images.length} / {MAX_IMAGES})
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Första bilden är primär och används som miniatyr.
                            </p>
                          </div>
                          {form.images.length > 0 && (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleImagesDragEnd}
                            >
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
                          <ImageDropzone
                            disabled={form.images.length >= MAX_IMAGES || uploadBusy}
                            busy={uploadBusy}
                            remaining={MAX_IMAGES - form.images.length}
                            maxImages={MAX_IMAGES}
                            onFiles={handleUploadFiles}
                          />
                        </section>

                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold">Karta och bokning</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Länk till karta (SV)">
                              <input
                                type="url"
                                value={form.map_url}
                                onChange={(e) => setForm({ ...form, map_url: e.target.value })}
                                placeholder="https://..."
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label="Map link (EN)">
                              <input
                                type="url"
                                value={form.map_url_en}
                                onChange={(e) => setForm({ ...form, map_url_en: e.target.value })}
                                placeholder="Lämna tomt = SV fallback"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label="Bokningsschema övningssalar (SV)">
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
                            <Field label="Practice room schedule (EN)">
                              <input
                                type="url"
                                value={form.booking_url_en}
                                onChange={(e) => setForm({ ...form, booking_url_en: e.target.value })}
                                placeholder="Lämna tomt = SV fallback"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold">Grupprum</h3>
                          <p className="text-xs text-muted-foreground">Fyll i endast för lokaler av typen grupprum.</p>
                          <Field label="Bokningsrumsnummer">
                            <input
                              value={form.booking_room_number}
                              onChange={(e) =>
                                setForm({ ...form, booking_room_number: e.target.value.replace(/[^0-9]/g, "") })
                              }
                              inputMode="numeric"
                              placeholder="t.ex. 4"
                              className="w-full sm:w-40 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                            />
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              Rumsnummer (1–21) i KTH:s bokningssystem. När det matchar visas en indikator om
                              grupprummet är <strong>ledigt</strong> eller <strong>upptaget</strong> just nu.
                            </p>
                          </Field>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Länk till boka grupprum (SV)">
                              <input
                                type="url"
                                value={form.group_booking_url}
                                onChange={(e) => setForm({ ...form, group_booking_url: e.target.value })}
                                placeholder="https://apps.lib.kth.se/mrbsgrupprum/day.php?area=1"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label="Book group room link (EN)">
                              <input
                                type="url"
                                value={form.group_booking_url_en}
                                onChange={(e) => setForm({ ...form, group_booking_url_en: e.target.value })}
                                placeholder="Lämna tomt = SV fallback"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label="Knapptext för länken (SV)">
                              <input
                                type="text"
                                value={form.group_booking_label}
                                onChange={(e) => setForm({ ...form, group_booking_label: e.target.value })}
                                placeholder="Boka grupprum"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Lämna tomt = "Boka grupprum". Skriv t.ex. "Boka resursrum" för resursrum.
                              </p>
                            </Field>
                            <Field label="Button label (EN)">
                              <input
                                type="text"
                                value={form.group_booking_label_en}
                                onChange={(e) => setForm({ ...form, group_booking_label_en: e.target.value })}
                                placeholder="Lämna tomt = SV fallback"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                            <Field label='"Boka nu" – ledigt grupprum (SV)'>
                              <input
                                type="text"
                                value={form.book_now_url}
                                onChange={(e) => setForm({ ...form, book_now_url: e.target.value })}
                                placeholder="https://.../edit_entry.php?area=1&room={room}&hour={hour}..."
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Mall. Platshållare: <code>{"{room}"}</code>, <code>{"{year}"}</code>,{" "}
                                <code>{"{month}"}</code>, <code>{"{day}"}</code>, <code>{"{hour}"}</code>,{" "}
                                <code>{"{minute}"}</code>.
                              </p>
                            </Field>
                            <Field label='"Book now" – free group room (EN)'>
                              <input
                                type="text"
                                value={form.book_now_url_en}
                                onChange={(e) => setForm({ ...form, book_now_url_en: e.target.value })}
                                placeholder="Lämna tomt = SV fallback"
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              />
                            </Field>
                          </div>
                        </section>
                      </TabsContent>

                      <TabsContent value="advanced" className="mt-0 space-y-5 focus-visible:outline-none">
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold">Realtidsdata (beläggning)</h3>
                          <Field label="Countmatters sensor-ID">
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
                            <span>
                              Visa beläggningsindikator på lokalkortet (kan slås av vid tekniska problem utan att radera
                              sensor-ID:t)
                            </span>
                          </label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Ange <strong>zonnamnet</strong> exakt som det står i Countmatters (t.ex.{" "}
                            <span className="font-mono">Newton</span>, <span className="font-mono">Ångdomen</span>,{" "}
                            <span className="font-mono">Södra Galleriet</span>). När namnet matchar en zon i KTH:s
                            realtids-API visas en indikator (grön/gul/röd). Lämna tomt för lokaler utan mätare.
                          </p>
                        </section>

                        {form.id && (
                          <section className="space-y-2">
                            <h3 className="text-sm font-semibold">Tekniskt</h3>
                            <p className="text-xs text-muted-foreground">
                              Tekniskt ID: <code className="bg-secondary px-1 py-0.5 rounded text-xs">{form.id}</code>
                            </p>
                          </section>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>

                  <DialogFooter className="px-6 py-3 border-t border-border shrink-0 bg-card sm:flex-row sm:items-center sm:justify-between gap-3">
                    {formErrors.length > 0 ? (
                      <ul className="text-xs text-destructive space-y-0.5 sm:mr-auto text-left" role="alert">
                        {formErrors.map((msg) => (
                          <li key={msg}>{msg}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="sm:mr-auto" />
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDialogOpenChange(false)}
                        className="px-4 py-2 rounded-lg text-sm border border-border"
                      >
                        Avbryt
                      </button>
                      <button
                        disabled={save.isPending || !form.name || !isDirty}
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        {save.isPending ? "Sparar..." : isDirty ? "Spara ändringar" : "Sparat"}
                      </button>
                    </div>

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
                >
                  Avmarkera
                </button>
                <div className="flex-1" />
                <select
                  value={bulkAction}
                  onChange={(e) => {
                    setBulkAction(e.target.value as BulkAction);
                    setBulkValue("");
                  }}
                  aria-label="Bulk-åtgärd"
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                >
                  {BULK_ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {bulkAction === "add_filter" || bulkAction === "remove_filter" ? (
                  <>
                    <select
                      value={bulkCategory}
                      onChange={(e) => {
                        setBulkCategory(e.target.value);
                        setBulkValue("");
                      }}
                      aria-label="Filterkategori"
                      className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    >
                      {categories
                        .filter((c) => c.key !== "vaningsplan")
                        .map((c) => (
                          <option key={c.id} value={c.key}>
                            {c.title}
                          </option>
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
                        <option key={o.id} value={o.label}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  BULK_ACTIONS.find((a) => a.value === bulkAction)?.needsValue &&
                  (() => {
                    const isRichText = BULK_RICH_TEXT_ACTIONS.includes(bulkAction);
                    if (isRichText) {
                      return (
                        <textarea
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          placeholder={BULK_ACTIONS.find((a) => a.value === bulkAction)?.placeholder ?? ""}
                          aria-label={BULK_ACTIONS.find((a) => a.value === bulkAction)?.placeholder ?? "Värde"}
                          rows={5}
                          className="basis-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed resize-y min-h-[7rem]"
                        />
                      );
                    }
                    return (
                      <input
                        value={bulkValue}
                        onChange={(e) => setBulkValue(e.target.value)}
                        placeholder={BULK_ACTIONS.find((a) => a.value === bulkAction)?.placeholder ?? ""}
                        aria-label={BULK_ACTIONS.find((a) => a.value === bulkAction)?.placeholder ?? "Värde"}
                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm min-w-[12rem]"
                      />
                    );
                  })()
                )}
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={applyBulk}
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {bulkBusy ? "Uppdaterar..." : "Tillämpa"}
                </button>
                {(bulkAction === "set_notice" ||
                  bulkAction === "set_notice_en" ||
                  bulkAction === "set_info" ||
                  bulkAction === "set_info_en" ||
                  bulkAction === "set_description" ||
                  bulkAction === "set_description_en") && (
                  <p className="basis-full text-xs text-muted-foreground leading-relaxed">
                    <strong>Länkar:</strong> länka till en webbsida med{" "}
                    <code className="text-[11px] bg-secondary px-1 py-0.5 rounded">
                      &lt;a href="https://exempel.se"&gt;Länktext&lt;/a&gt;
                    </code>
                    . Länka till ett annat lokalkort med{" "}
                    <code className="text-[11px] bg-secondary px-1 py-0.5 rounded">[[slug|Länktext]]</code> (eller bara{" "}
                    <code className="text-[11px] bg-secondary px-1 py-0.5 rounded">[[slug]]</code> för att använda
                    lokalens namn).
                  </p>
                )}
              </div>
            )}

            <SelectByLokaltyp
              spaces={spaces}
              options={byKey["lokaltyp"] ?? []}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
            />

            <div className="space-y-2">
              {isLoading ? (
                <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                  Laddar...
                </div>
              ) : spaces.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground text-sm">
                  Inga lokaler ännu. Klicka på <span className="font-medium text-foreground">Ny lokal</span> för att
                  komma igång.
                </div>
              ) : (
                <>
                  {/* List toolbar: search, filters, compact toggle */}
                  <div className="bg-card border border-border rounded-xl p-2 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[12rem]">
                      <Search
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={listQuery}
                        onChange={(e) => setListQuery(e.target.value)}
                        placeholder="Sök på namn, slug, plan eller lokal…"
                        aria-label="Sök i lokallistan"
                        className="w-full rounded-lg border border-border bg-background pl-8 pr-8 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {listQuery && (
                        <button
                          type="button"
                          onClick={() => setListQuery("")}
                          aria-label="Rensa sökning"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="sr-only">Typ</span>
                      <select
                        value={listKind}
                        onChange={(e) => setListKind(e.target.value)}
                        aria-label="Filtrera på typ"
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="all">Alla typer</option>
                        {spaceKindOptions.map((o) => (
                          <option key={o.id} value={o.value_key ?? ""}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="sr-only">Lokaltyp</span>
                      <select
                        value={listLokaltyp}
                        onChange={(e) => setListLokaltyp(e.target.value)}
                        aria-label="Filtrera på lokaltyp"
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="all">Alla lokaltyper</option>
                        {(byKey["lokaltyp"] ?? [])
                          .filter((o) => !o.hidden)
                          .map((o) => (
                            <option key={o.id} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="sr-only">Synlighet</span>
                      <select
                        value={listVisibility}
                        onChange={(e) => setListVisibility(e.target.value as "all" | "visible" | "hidden")}
                        aria-label="Filtrera på synlighet"
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="all">Alla</option>
                        <option value="visible">Endast synliga</option>
                        <option value="hidden">Endast dolda</option>
                      </select>
                    </label>
                    <label className="text-xs flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg cursor-pointer select-none hover:bg-accent/60">
                      <Switch checked={listCompact} onCheckedChange={setListCompact} aria-label="Kompakt vy" />
                      <span className="text-foreground">Kompakt vy</span>
                    </label>
                    {listFiltersActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setListQuery("");
                          setListKind("all");
                          setListVisibility("all");
                          setListLokaltyp("all");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Rensa filter
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      aria-label="Markera alla synliga"
                      checked={filteredSpaces.length > 0 && filteredSpaces.every((s) => selectedIds.has(s.id))}
                      ref={(el) => {
                        if (el) {
                          const sel = filteredSpaces.filter((s) => selectedIds.has(s.id)).length;
                          el.indeterminate = sel > 0 && sel < filteredSpaces.length;
                        }
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            filteredSpaces.forEach((s) => next.add(s.id));
                            return next;
                          });
                        } else {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            filteredSpaces.forEach((s) => next.delete(s.id));
                            return next;
                          });
                        }
                      }}
                    />
                    <span>
                      {listFiltersActive
                        ? `Markera alla ${filteredSpaces.length} träffar`
                        : `Markera alla · ${spaces.length} lokaler/ytor`}
                    </span>
                  </div>

                  {listFiltersActive && (
                    <div className="text-xs text-muted-foreground px-4 py-1.5 rounded-lg bg-muted/40 border border-dashed border-border">
                      Filter är aktivt — omordning är inaktiverad. Rensa filter för att sortera om listan.
                    </div>
                  )}

                  {filteredSpaces.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground text-sm">
                      Inga lokaler matchar dina filter.
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSpacesDragEnd}>
                      <SortableContext items={filteredSpaces.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                        <ul className={cn("list-none", listCompact ? "space-y-1" : "space-y-2")}>
                          {filteredSpaces.map((s) => (
                            <SortableSpaceRow
                              key={s.id}
                              space={s}
                              selected={selectedIds.has(s.id)}
                              compact={listCompact}
                              dragDisabled={listFiltersActive}
                              onToggleSelected={() => toggleSelected(s.id)}
                              onEdit={() => openEdit(s)}
                              onToggleHidden={() => toggleHidden.mutate({ id: s.id, hidden: !s.hidden })}
                              onDelete={() => {
                                if (!s.hidden) {
                                  toast.error("Dölj lokalen först innan du kan radera den.");
                                  return;
                                }
                                if (confirm(`Ta bort "${s.name}"? Detta går inte att ångra.`)) del.mutate(s.id);
                              }}
                            />
                          ))}
                        </ul>
                      </SortableContext>
                    </DndContext>
                  )}
                </>
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

          <TabsContent value="hours">
            <OpeningHoursTab />
          </TabsContent>



          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
