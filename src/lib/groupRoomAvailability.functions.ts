import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

// TODO: Path segments `/1/1/` are hardcoded for now (library 1 / floor 1).
// Move to a per-space field if KTH adds more locations in the future.
const API_BASE =
  "https://api.lib.kth.se/bookingsystem/v1/roomsavailability/grouprooms/1/1";

export type RoomStatus = "free" | "busy" | "tentative";

export type RoomAvailability = {
  status: RoomStatus;
  disabled: boolean;
};

export type GroupRoomAvailability = {
  rooms: Record<string, RoomAvailability>;
  lastUpdated: string | null;
  error?: string;
};

function normalizeStatus(raw: unknown, availability: unknown): RoomStatus {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (s === "tentative" || s === "booked") return "tentative";
  if (s === "confirmed") return "busy";
  if (s === "free") return "free";
  return availability ? "free" : "busy";
}

export const getGroupRoomAvailability = createServerFn({ method: "GET" }).handler(
  async (): Promise<GroupRoomAvailability> => {
    try {
      const ts = Math.floor(Date.now() / 1000);
      const res = await fetch(`${API_BASE}/${ts}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        return { rooms: {}, lastUpdated: null, error: `HTTP ${res.status}` };
      }
      const json = (await res.json()) as Array<{
        room_number?: string | number;
        disabled?: number;
        availability?: boolean;
        status?: string;
      }>;
      const rooms: Record<string, RoomAvailability> = {};
      for (const r of json ?? []) {
        if (r?.room_number == null) continue;
        rooms[String(r.room_number)] = {
          status: normalizeStatus(r.status, r.availability),
          disabled: r.disabled === 1,
        };
      }
      try {
        setResponseHeader("Cache-Control", "public, max-age=20");
      } catch {
        // not in request context
      }
      return { rooms, lastUpdated: new Date().toISOString() };
    } catch (e) {
      return {
        rooms: {},
        lastUpdated: null,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  },
);
