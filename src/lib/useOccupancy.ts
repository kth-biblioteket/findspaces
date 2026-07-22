import { useQuery } from "@tanstack/react-query";
import { getRealtimeOccupancy } from "./occupancy.functions";

export type OccupancyStatus = "free" | "moderate" | "busy";

export type Occupancy = {
  level: 1 | 2 | 3;
  status: OccupancyStatus;
  inside: number;
  threshold: number;
  ratio: number;
  updatedAt: Date | null;
  isLive: boolean;
};

export function useRealtimeOccupancy() {
  return useQuery({
    queryKey: ["occupancy-realtime"],
    queryFn: () => getRealtimeOccupancy(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useOccupancy(sensorId: string | null | undefined): Occupancy | null {
  const { data } = useRealtimeOccupancy();
  if (!sensorId) return null;
  const zone = data?.zones?.[sensorId];
  if (!zone || !zone.threshold || zone.threshold <= 0) return null;

  const ratio = zone.inside / zone.threshold;
  const level: 1 | 2 | 3 = ratio < 0.5 ? 1 : ratio < 0.85 ? 2 : 3;
  const status: OccupancyStatus =
    level === 1 ? "free" : level === 2 ? "moderate" : "busy";

  return {
    level,
    status,
    inside: zone.inside,
    threshold: zone.threshold,
    ratio,
    updatedAt: data?.lastUpdated ? new Date(data.lastUpdated) : null,
    isLive: true,
  };
}

export const OCCUPANCY_LABEL_KEYS: Record<OccupancyStatus, string> = {
  free: "occupancy.free",
  moderate: "occupancy.moderate",
  busy: "occupancy.busy",
};
