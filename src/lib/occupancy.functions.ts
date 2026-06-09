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
  error?: string;
};

export const getRealtimeOccupancy = createServerFn({ method: "GET" }).handler(
  async (): Promise<RealtimeOccupancy> => {
    try {
      const res = await fetch(API_URL, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        return { zones: {}, lastUpdated: null, error: `HTTP ${res.status}` };
      }
      const json = (await res.json()) as {
        data?: { zones?: Array<{ name?: string; inside?: number; threshold?: number }> };
        lastUpdated?: string;
      };
      const zones: Record<string, ZoneOccupancy> = {};
      for (const z of json.data?.zones ?? []) {
        if (!z?.name) continue;
        zones[z.name] = {
          inside: Number(z.inside ?? 0),
          threshold: Number(z.threshold ?? 0),
        };
      }
      // Short cache to ease load when many cards render at once.
      try {
        setResponseHeader("Cache-Control", "public, max-age=20");
      } catch {
        // not in request context
      }
      return { zones, lastUpdated: json.lastUpdated ?? null };
    } catch (e) {
      return {
        zones: {},
        lastUpdated: null,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  },
);
