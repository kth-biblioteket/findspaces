import { useOccupancy, type OccupancyStatus } from "./useOccupancy";
import { useGroupRoomAvailability, type GroupRoomStatus } from "./useGroupRoomAvailability";
import { useOccupancySettings, isWithinSchedule, DEFAULT_SCHEDULE } from "./useOccupancySettings";
import type { Space } from "./spaces";

export type LiveOccupancy = { level: 1 | 2 | 3; status: OccupancyStatus };
export type LiveGroupRoom = { status: GroupRoomStatus };

/**
 * Centralises the "should we show a live status badge on this card?" logic.
 * Combines the global schedule/enabled flag, per-space `show_occupancy` opt-out,
 * and admin preview overrides. Returns `null` for either channel when nothing
 * should render.
 */
export function useLiveSpaceStatus(
  space: Pick<Space, "countmatters_sensor_id" | "booking_room_number" | "show_occupancy">,
  preview?: { occupancy?: LiveOccupancy; groupRoom?: LiveGroupRoom },
): { occupancy: LiveOccupancy | null; groupRoom: LiveGroupRoom | null; settingsActive: boolean } {
  const rawOccupancy = useOccupancy(space.countmatters_sensor_id);
  const rawGroupRoom = useGroupRoomAvailability(space.booking_room_number);
  const { data: occSettings } = useOccupancySettings();

  const settingsActive =
    (occSettings?.enabled ?? true) &&
    isWithinSchedule(occSettings?.schedule ?? DEFAULT_SCHEDULE, new Date());

  const occupancyVisible = space.show_occupancy !== false && settingsActive;
  const occupancy = preview?.occupancy ?? (occupancyVisible ? rawOccupancy : null);
  const groupRoom = preview?.groupRoom ?? (settingsActive ? rawGroupRoom : null);

  return { occupancy, groupRoom, settingsActive };
}
