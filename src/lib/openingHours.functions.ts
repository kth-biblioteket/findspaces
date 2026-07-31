import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

const BASE_URL =
  "https://api.lib.kth.se/bookingsystem/v1/openinghoursjson/openinghours";

export type OpeningHoursDay = {
  date: string;
  name: string;
  hours: string;
};

export type OpeningHours = {
  /** true when the API says the library is open today */
  openToday: boolean;
  /** raw hours string for today, e.g. "08:00 - 20:00" or "Closed" */
  hoursToday: string | null;
  todaysDate: string | null;
  days: OpeningHoursDay[];
  httpStatus: number;
  fetchedAt: string;
  apiUrl: string;
  error?: string;
};

/** Today's date in Swedish local time, YYYY-MM-DD. */
export function swedishToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export const getOpeningHours = createServerFn({ method: "GET" }).handler(
  async (): Promise<OpeningHours> => {
    const fetchedAt = new Date().toISOString();
    const apiUrl = `${BASE_URL}/${swedishToday()}/1/2/sv`;
    try {
      const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        return {
          openToday: true, // fail open so students keep seeing live data
          hoursToday: null,
          todaysDate: null,
          days: [],
          httpStatus: res.status,
          fetchedAt,
          apiUrl,
          error: `HTTP ${res.status}`,
        };
      }
      const json = (await res.json()) as {
        opentoday?: boolean;
        opentodayhours?: string;
        todaysdate?: string;
        days?: OpeningHoursDay[];
      };
      try {
        setResponseHeader("Cache-Control", "public, max-age=300");
      } catch {
        // not in request context
      }
      return {
        openToday: Boolean(json.opentoday),
        hoursToday: json.opentodayhours ?? null,
        todaysDate: json.todaysdate ?? null,
        days: Array.isArray(json.days) ? json.days : [],
        httpStatus: res.status,
        fetchedAt,
        apiUrl,
      };
    } catch (e) {
      return {
        openToday: true, // fail open
        hoursToday: null,
        todaysDate: null,
        days: [],
        httpStatus: 0,
        fetchedAt,
        apiUrl,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  },
);
