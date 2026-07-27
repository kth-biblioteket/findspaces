import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY_ENABLED = "occupancy_enabled_global";
const KEY_SCHEDULE = "occupancy_schedule";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS_SV: Record<Weekday, string> = {
  mon: "Måndag", tue: "Tisdag", wed: "Onsdag", thu: "Torsdag",
  fri: "Fredag", sat: "Lördag", sun: "Söndag",
};

export type DaySchedule = { enabled: boolean; from: string; to: string };
export type OccupancySchedule = Record<Weekday, DaySchedule>;

export const DEFAULT_SCHEDULE: OccupancySchedule = {
  mon: { enabled: true, from: "08:00", to: "20:00" },
  tue: { enabled: true, from: "08:00", to: "20:00" },
  wed: { enabled: true, from: "08:00", to: "20:00" },
  thu: { enabled: true, from: "08:00", to: "20:00" },
  fri: { enabled: true, from: "08:00", to: "20:00" },
  sat: { enabled: true, from: "10:00", to: "17:00" },
  sun: { enabled: false, from: "10:00", to: "17:00" },
};

export type OccupancySettings = {
  enabled: boolean;
  schedule: OccupancySchedule;
};

function parseSchedule(raw: string | null | undefined): OccupancySchedule {
  if (!raw) return DEFAULT_SCHEDULE;
  try {
    const parsed = JSON.parse(raw) as Partial<OccupancySchedule>;
    const out = { ...DEFAULT_SCHEDULE };
    for (const d of WEEKDAYS) {
      const v = parsed[d];
      if (v && typeof v === "object") {
        out[d] = {
          enabled: Boolean(v.enabled),
          from: typeof v.from === "string" ? v.from : DEFAULT_SCHEDULE[d].from,
          to: typeof v.to === "string" ? v.to : DEFAULT_SCHEDULE[d].to,
        };
      }
    }
    return out;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function useOccupancySettings() {
  return useQuery({
    queryKey: ["occupancy-settings"],
    queryFn: async (): Promise<OccupancySettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [KEY_ENABLED, KEY_SCHEDULE]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      const enabledRaw = map.get(KEY_ENABLED);
      return {
        enabled: enabledRaw == null ? true : enabledRaw === "true",
        schedule: parseSchedule(map.get(KEY_SCHEDULE)),
      };
    },
  });
}

export function useSaveOccupancySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: OccupancySettings) => {
      const { error } = await supabase.from("app_settings").upsert([
        { key: KEY_ENABLED, value: s.enabled ? "true" : "false" },
        { key: KEY_SCHEDULE, value: JSON.stringify(s.schedule) },
      ]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["occupancy-settings"] }),
  });
}

/** Returns true when current local time falls within the schedule for today. */
export function isWithinSchedule(schedule: OccupancySchedule, now: Date = new Date()): boolean {
  // JS getDay: 0=Sun..6=Sat
  const js = now.getDay();
  const key: Weekday = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as Weekday[])[js];
  const day = schedule[key];
  if (!day || !day.enabled) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = day.from.split(":").map((x) => parseInt(x, 10));
  const [th, tm] = day.to.split(":").map((x) => parseInt(x, 10));
  const from = (fh || 0) * 60 + (fm || 0);
  const to = (th || 0) * 60 + (tm || 0);
  return nowMin >= from && nowMin <= to;
}
