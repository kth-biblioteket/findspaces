import {
  VolumeX, Volume1, Volume2,
  Sliders, Monitor, Tv, Edit, Columns, Armchair,
  Utensils, Sun, Printer, Toilet, Accessibility,
  type LucideIcon,
} from "lucide-react";

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

export const INTENT_OPTIONS = [
  "Enskilt, i avskildhet",
  "Där andra studerar",
  "Med vänner",
  "Med ett grupparbete",
] as const;

export const NOISE_OPTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Tyst", icon: VolumeX },
  { label: "Samtalston", icon: Volume1 },
  { label: "Ljudligt", icon: Volume2 },
];

export const EQUIPMENT_OPTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Höj- och sänkbara bord", icon: Sliders },
  { label: "Datorer", icon: Monitor },
  { label: "Skärm", icon: Tv },
  { label: "Whiteboard", icon: Edit },
  { label: "Studiebås", icon: Columns },
  { label: "Höj- och sänkbara stolar", icon: Armchair },
];

export const FACILITY_OPTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Mat tillåten", icon: Utensils },
  { label: "Dagsljus", icon: Sun },
  { label: "Skrivare", icon: Printer },
  { label: "Toalett", icon: Accessibility },
];

export const iconForLabel = (label: string): LucideIcon | null => {
  const all = [...NOISE_OPTIONS, ...EQUIPMENT_OPTIONS, ...FACILITY_OPTIONS];
  return all.find((o) => o.label === label)?.icon ?? null;
};
