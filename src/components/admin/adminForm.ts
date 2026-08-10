import { type Space } from "@/lib/spaces";

export const MAX_IMAGES = 8;

export type BulkAction =
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

export const BULK_ACTIONS: { value: BulkAction; label: string; needsValue: boolean; placeholder?: string }[] = [
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

export const BULK_RICH_TEXT_ACTIONS: BulkAction[] = [
  "set_description",
  "set_description_en",
  "set_notice",
  "set_notice_en",
  "set_info",
  "set_info_en",
];


export type FormState = {
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

export const emptyForm: FormState = {
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

export function spaceToForm(s: Space): FormState {
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

export function getFormValues(form: FormState, key: string): string[] {
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

export function setFormValues(form: FormState, key: string, values: string[]): FormState {
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

