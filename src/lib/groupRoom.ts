import type { FilterOption, Space } from "@/lib/spaces";

/**
 * Group-room detection is driven by the stable `value_key` of the room-type
 * options, never by their Swedish labels — an admin renaming "Grupprum" must
 * not break filtering or the card logic.
 */
export const GROUP_ROOM_VALUE_KEYS = ["grupprum", "resursrum"] as const;
export const ROOM_TYPE_CATEGORY = "lokaltyp";

/** Labels (as stored on `spaces.lokaltyp`) that mark a space as a group room. */
export function groupRoomLabels(options: FilterOption[]): string[] {
  const labels = options
    .filter(
      (option) =>
        option.category === ROOM_TYPE_CATEGORY &&
        option.value_key != null &&
        (GROUP_ROOM_VALUE_KEYS as readonly string[]).includes(option.value_key),
    )
    .map((option) => option.label);
  // Fall back to the seed labels if the options haven't loaded yet.
  return labels.length > 0 ? labels : ["Grupprum", "Resursrum"];
}

export function isGroupRoomSpace(space: Space, labels: string[]): boolean {
  if ((space.intent ?? []).includes("grupprum")) return true;
  return (space.lokaltyp ?? []).some((value) => labels.includes(value));
}
