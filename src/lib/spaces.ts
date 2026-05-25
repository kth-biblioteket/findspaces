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
  image_url: string | null;
};

export type FilterCategory = "intent" | "noise" | "equipment" | "facility";

export type FilterOption = {
  id: string;
  category: FilterCategory;
  label: string;
  icon_url: string | null;
  default_icon: string | null;
  sort_order: number;
};

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

/** Returns either a Lucide component or a URL string for a custom icon. */
export function resolveIcon(opt: Pick<FilterOption, "icon_url" | "default_icon">):
  | { type: "lucide"; Icon: LucideIcon }
  | { type: "url"; url: string }
  | null {
  if (opt.icon_url) return { type: "url", url: opt.icon_url };
  const Icon = getLucideIcon(opt.default_icon);
  if (Icon) return { type: "lucide", Icon };
  return null;
}
