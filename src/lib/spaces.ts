import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Space = {
  id: string;
  name: string;
  category: string;
  description: string;
  intent: string[];
  noise: string;
  equipment: string[];
  facilities: string[];
  lokaltyp: string[];
  image_url: string | null;
  images: string[];
  image_alts: string[];
  map_url: string | null;
  booking_url: string | null;
  sort_order: number;
  floor: string | null;
  tags: Record<string, string[]>;
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
  icon_url: string | null;
  default_icon: string | null;
  sort_order: number;
};

/** Read the array of selected values on a space for a given category. */
export function getSpaceValues(space: Space, key: string): string[] {
  switch (key) {
    case "intent": return space.intent ?? [];
    case "noise": return space.noise ? [space.noise] : [];
    case "equipment": return space.equipment ?? [];
    case "facility": return space.facilities ?? [];
    case "lokaltyp": return space.lokaltyp ?? [];
    default: {
      const v = space.tags?.[key];
      return Array.isArray(v) ? v : [];
    }
  }
}

export const LUCIDE_ICON_CHOICES = [
  "VolumeX", "Volume1", "Volume2",
  "Sliders", "Monitor", "Tv", "Edit", "Columns", "Armchair",
  "Utensils", "Sun", "Printer", "Toilet", "Accessibility",
  "Users", "User", "Coffee", "Wifi", "Lightbulb", "BookOpen",
  "Headphones", "Mic", "Camera", "Projector", "Plug", "Wind",
  "Snowflake", "Heart", "Star", "Leaf",
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
