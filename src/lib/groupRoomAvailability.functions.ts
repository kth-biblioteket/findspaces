import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

// TODO: Path segments `/1/1/` are hardcoded for now (library 1 / floor 1).
// Move to a per-space field if KTH adds more locations in the future.
const API_BASE =
  "https://api.lib.kth.se/bookingsystem/v1/roomsavailability/grouprooms/1/1";

export type RoomAvailability = {
  available: boolean;
  disabled: boolean;
};

export type GroupRoomAvailability = {
  rooms: Record<string, RoomAvailability>;
  lastUpdated: string | null;
  error?: string;
};

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
      }>;
      const rooms: Record<string, RoomAvailability> = {};
      for (const r of json ?? []) {
        if (r?.room_number == null) continue;
        rooms[String(r.room_number)] = {
          available: Boolean(r.availability),
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
