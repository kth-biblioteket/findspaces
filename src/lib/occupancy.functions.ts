import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

const API_URL =
  "https://apps.lib.kth.se/smartsigntools/api/v1/imas/realtime";

export type ZoneOccupancy = {
  inside: number;
  threshold: number;
};

export type RealtimeOccupancy = {
  zones: Record<string, ZoneOccupancy>;
  lastUpdated: string | null;
  /** raw KTH "location" field, e.g. "open" or "closed" */
  location: string | null;
  /** raw KTH hours block for the current day, if provided */
  hours: { from: string | null; to: string | null } | null;
  /** HTTP status from the last fetch (0 on network error) */
  httpStatus: number;
  /** When this response was fetched (server time, ISO) */
  fetchedAt: string;
  /** URL that was called – handy in the admin diagnostics view */
  apiUrl: string;
  error?: string;
};

type RawZone = { name?: string; inside?: number; threshold?: number };

function extractZones(rawData: unknown): RawZone[] {
  if (Array.isArray(rawData)) return rawData as RawZone[];
  if (rawData && typeof rawData === "object") {
    const maybe = (rawData as { zones?: unknown }).zones;
    if (Array.isArray(maybe)) return maybe as RawZone[];
  }
  return [];
}

export const getRealtimeOccupancy = createServerFn({ method: "GET" }).handler(
  async (): Promise<RealtimeOccupancy> => {
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetch(API_URL, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        return {
          zones: {},
          lastUpdated: null,
          location: null,
          hours: null,
          httpStatus: res.status,
          fetchedAt,
          apiUrl: API_URL,
          error: `HTTP ${res.status}`,
        };
      }
      const json = (await res.json()) as {
        data?: unknown;
        lastUpdated?: string;
        location?: string;
        hours?: { from?: string; until?: string };
      };
      const zones: Record<string, ZoneOccupancy> = {};
      for (const z of extractZones(json.data)) {
        if (!z?.name) continue;
        zones[z.name] = {
          inside: Number(z.inside ?? 0),
          threshold: Number(z.threshold ?? 0),
        };
      }
      try {
        setResponseHeader("Cache-Control", "public, max-age=20");
      } catch {
        // not in request context
      }
      return {
        zones,
        lastUpdated: json.lastUpdated ?? null,
        location: json.location ?? null,
        hours: json.hours
          ? { from: json.hours.from ?? null, to: json.hours.until ?? null }
          : null,
        httpStatus: res.status,
        fetchedAt,
        apiUrl: API_URL,
      };
    } catch (e) {
      return {
        zones: {},
        lastUpdated: null,
        location: null,
        hours: null,
        httpStatus: 0,
        fetchedAt,
        apiUrl: API_URL,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  },
);
