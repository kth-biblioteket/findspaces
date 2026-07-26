import type { Filters } from "@/components/FilterPanel";
import { matchesSpace } from "@/lib/filterMatch";
import type { FilterCategoryRow, Space } from "@/lib/spaces";

export type RoomAvailability = {
  status: string;
  disabled?: boolean;
};

export type AvailabilitySnapshot = {
  rooms: Record<string, RoomAvailability>;
};

export function matchesSpaceKind(space: Space, spaceKind: Filters["spaceKind"]): boolean {
  return (space.space_kind ?? "study") === spaceKind;
}

export function countSpacesForKind(spaces: Space[], spaceKind: Filters["spaceKind"]): number {
  return spaces.filter((space) => matchesSpaceKind(space, spaceKind)).length;
}

/**
 * The single filtering pipeline used by the result list, mobile draft count,
 * and zero-result suggestions. Keep live-availability rules here so simulated
 * filter removal always produces the same count as the rendered list.
 */
export function filterSpaces(
  spaces: Space[],
  filters: Filters,
  categories: FilterCategoryRow[],
  availability?: AvailabilitySnapshot,
): Space[] {
  const matched = spaces
    .filter((space) => matchesSpaceKind(space, filters.spaceKind))
    .filter((space) => matchesSpace(space, filters, categories));

  if (filters.workMode !== "grupprum" || !filters.freeOnly) {
    return matched;
  }

  const rooms = availability?.rooms ?? {};
  return matched.filter((space) => {
    const roomNumber = space.booking_room_number;
    if (roomNumber == null) return false;
    const room = rooms[String(roomNumber)];
    return Boolean(room && !room.disabled && room.status === "free");
  });
}
