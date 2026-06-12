import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Space = {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  description: string;
  description_en: string | null;
  intent: string[];
  noise: string[];
  equipment: string[];
  facilities: string[];
  lokaltyp: string[];
  image_url: string | null;
  images: string[];
  image_alts: string[];
  image_alts_en: string[];
  map_url: string | null;
  booking_url: string | null;
  group_booking_url: string | null;
  group_booking_url_en: string | null;
  book_now_url: string | null;
  book_now_url_en: string | null;

  sort_order: number;
  floor: string | null;
  floor_en: string | null;
  located_in: string | null;
  located_in_en: string | null;
  capacity: number | null;
  tags: Record<string, string[]>;
  notice: string | null;
  notice_en: string | null;
  info: string | null;
  info_en: string | null;
  show_capacity_publicly: boolean;
  show_occupancy: boolean;
  countmatters_sensor_id: string | null;
  booking_room_number: number | null;
};

/** Category keys that map to dedicated columns on the spaces table. */
export const LOCKED_CATEGORY_KEYS = [
  "intent", "noise", "equipment", "facility", "lokaltyp",
] as const;
export type LockedCategoryKey = typeof LOCKED_CATEGORY_KEYS[number];

export function isLockedKey(k: string): k is LockedCategoryKey {
  return (LOCKED_CATEGORY_KEYS as readonly string[]).includes(k);
}

export type FilterCategoryRow = {
  id: string;
  key: string;
  title: string;
  title_en: string | null;
  style: "list" | "pills";
  match_mode: "any" | "all";
  is_single_select: boolean;
  locked: boolean;
  sort_order: number;
};

export type FilterOption = {
  id: string;
  category: string;
  label: string;
  label_en: string | null;
  icon_url: string | null;
  default_icon: string | null;
  sort_order: number;
};

/** Read the array of selected values on a space for a given category. */
export function getSpaceValues(space: Space, key: string): string[] {
  switch (key) {
    case "intent": return space.intent ?? [];
    case "noise": return space.noise ?? [];
    case "equipment": return space.equipment ?? [];
    case "facility": return space.facilities ?? [];
    case "lokaltyp": return space.lokaltyp ?? [];
    // Floor-level category: derived from the space.floor column so the
    // existing per-space floor value powers the filter automatically.
    case "vaningsplan": return space.floor ? [space.floor] : [];
    default: {
      const v = space.tags?.[key];
      return Array.isArray(v) ? v : [];
    }
  }
}

export const LUCIDE_ICON_CHOICES = [
  "VolumeOff", "VolumeX", "Volume1", "Volume2", "Volume", "Ear", "EarOff", "BellOff",
  "Sliders", "Settings", "Monitor", "MonitorSmartphone", "Tv", "Tv2",
  "Laptop", "Computer", "Keyboard", "Mouse", "HardDrive",
  "Edit", "Edit3", "PenTool", "Pencil", "PencilRuler",
  "Columns", "Columns3", "LayoutGrid", "LayoutPanelLeft",
  "Armchair", "Sofa", "Bed", "Table",
  "Utensils", "UtensilsCrossed", "Coffee", "CupSoda", "Pizza", "Apple",
  "Sun", "SunMedium", "Sunrise", "Sunset", "CloudSun", "Moon",
  "Printer", "Scan", "ScanLine", "Copy", "FileText", "Files", "Paperclip",
  "Toilet", "Accessibility", "PersonStanding", "Footprints",
  "Users", "Users2", "UserPlus", "User", "UserCheck",
  "Wifi", "WifiOff", "Signal", "Bluetooth",
  "Lightbulb", "LightbulbOff", "Lamp", "LampDesk",
  "BookOpen", "Book", "BookMarked", "Library", "GraduationCap", "School",
  "Headphones", "HeadphonesIcon", "Mic", "MicOff", "Speaker", "Radio",
  "Camera", "Video", "VideoOff", "Projector", "Presentation",
  "Plug", "PlugZap", "Power", "BatteryCharging", "Zap",
  "Wind", "Snowflake", "Thermometer", "Droplet", "Flame",
  "Heart", "Star", "Sparkles", "Award", "Flag",
  "Leaf", "TreePine", "TreeDeciduous", "Flower", "Sprout",
  "MapPin", "Map", "Navigation", "Compass", "Locate",
  "Calendar", "Clock", "Timer", "AlarmClock",
  "Lock", "Unlock", "Key", "Shield", "ShieldCheck",
  "Phone", "PhoneCall", "MessageSquare", "Mail",
  "Search", "Filter", "Eye", "EyeOff",
  "CheckCircle", "Circle", "Square", "Triangle",
  "Volume2Icon", "DoorOpen", "DoorClosed", "Building", "Building2", "Home",
  "Baby", "Dog", "Cat",
  "ShoppingBag", "ShoppingCart", "Gift",
  "AlertTriangle", "AlertCircle", "Info", "HelpCircle",
] as const;

export function getLucideIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return Icon ?? null;
}

export function resolveIcon(opt: Pick<FilterOption, "icon_url" | "default_icon">):
  | { type: "lucide"; Icon: LucideIcon }
  | { type: "url"; url: string }
  | null {
  if (opt.icon_url) return { type: "url", url: opt.icon_url };
  const Icon = getLucideIcon(opt.default_icon);
  if (Icon) return { type: "lucide", Icon };
  return null;
}
