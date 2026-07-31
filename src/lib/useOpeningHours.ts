import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOpeningHours, type OpeningHours } from "./openingHours.functions";

/**
 * Parses an hours string like "08:00 - 20:00" into minutes from midnight.
 * Returns null when the string has no parseable time range (e.g. "Closed",
 * "Open 24h"), in which case callers should treat the day as fully open.
 */
export function parseHoursRange(
  hours: string | null | undefined,
): { from: number; to: number } | null {
  if (!hours) return null;
  const matches = [...hours.matchAll(/(\d{1,2})[:.](\d{2})/g)];
  if (matches.length < 2) return null;
  const toMin = (m: RegExpMatchArray) =>
    parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const from = toMin(matches[0]);
  const to = toMin(matches[1]);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
  return { from, to };
}

/** True when `now` (Swedish local time) falls inside today's opening hours. */
export function isOpenNow(data: OpeningHours | undefined, now: Date): boolean {
  // Fail open: no data yet, or the API errored -> keep the UI fully usable.
  if (!data || data.error) return true;
  if (!data.openToday) return false;
  const range = parseHoursRange(data.hoursToday);
  if (!range) return true;
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [h, m] = parts.split(":").map((x) => parseInt(x, 10));
  const nowMin = (h || 0) * 60 + (m || 0);
  return nowMin >= range.from && nowMin <= range.to;
}

/** Fetches today's opening hours from the KTH library API. */
export function useOpeningHours() {
  const fetchOpeningHours = useServerFn(getOpeningHours);
  return useQuery({
    queryKey: ["opening-hours"],
    queryFn: () => fetchOpeningHours(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
