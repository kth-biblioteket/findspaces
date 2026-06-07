import { useEffect, useState } from "react";

export type OccupancyStatus = "free" | "moderate" | "busy";

export type Occupancy = {
  percent: number;
  status: OccupancyStatus;
  updatedAt: Date;
  /** True once a real Countmatters integration is wired in. */
  isLive: boolean;
};

const THRESHOLDS = { moderate: 40, busy: 75 } as const;

function statusFor(percent: number): OccupancyStatus {
  if (percent >= THRESHOLDS.busy) return "busy";
  if (percent >= THRESHOLDS.moderate) return "moderate";
  return "free";
}

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

  // Hash sensor id + minute bucket → 0..100
  const minute = Math.floor(Date.now() / 60_000);
  let seed = 0;
  const key = `${sensorId}:${minute}`;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  // Smooth-ish curve: bias around 30–85 % during "day"
  const base = 30 + (seed % 56); // 30..85
  const percent = Math.min(100, Math.max(0, base));

  return {
    percent,
    status: statusFor(percent),
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
