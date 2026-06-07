import { useEffect, useState } from "react";

export type OccupancyStatus = "free" | "moderate" | "busy";

export type Occupancy = {
  level: 1 | 2 | 3;
  status: OccupancyStatus;
  updatedAt: Date;
  /** True once a real Countmatters integration is wired in. */
  isLive: boolean;
};

/**
 * Placeholder occupancy hook.
 *
 * Returns a deterministic-but-time-varying value derived from the sensor ID
 * so each space gets its own steady curve until the real Countmatters API is
 * wired in. The value re-rolls every minute to simulate a live feed.
 */
export function useOccupancy(sensorId: string | null | undefined): Occupancy | null {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!sensorId) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [sensorId]);

  if (!sensorId) return null;

  // Hash sensor id + minute bucket → 1..3
  const minute = Math.floor(Date.now() / 60_000);
  let seed = 0;
  const key = `${sensorId}:${minute}`;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;

  const level = ((seed % 3) + 1) as 1 | 2 | 3;

  const status: OccupancyStatus =
    level === 1 ? "free" : level === 2 ? "moderate" : "busy";

  return {
    level,
    status,
    updatedAt: new Date(),
    isLive: false, // placeholder — flip to true when Countmatters API is wired in
    // tick keeps lint happy
    ...({ _tick: tick } as object),
  };
}

export const OCCUPANCY_LABEL_KEYS: Record<OccupancyStatus, string> = {
  free: "occupancy.free",
  moderate: "occupancy.moderate",
  busy: "occupancy.busy",
};
