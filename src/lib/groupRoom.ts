import type { FilterOption, Space } from "@/lib/spaces";

/**
 * Group-room detection is driven by the stable `value_key` of the room-type
 * options, never by their Swedish labels — an admin renaming "Grupprum" must
 * not break filtering or the card logic.
 */
export const ROOM_TYPE_CATEGORY = "lokaltyp";
/** Room types that make a space count as a bookable group room. */
export const GROUP_ROOM_VALUE_KEYS = ["grupprum"] as const;
/** Room types already conveyed by the group-room chip, so hidden in card meta. */
export const CARD_HIDDEN_ROOM_TYPE_KEYS = ["grupprum", "resursrum"] as const;

function labelsForKeys(
  options: FilterOption[],
  keys: readonly string[],
  fallback: string[],
): string[] {
  const labels = options
    .filter(
      (option) =>
        option.category === ROOM_TYPE_CATEGORY &&
        option.value_key != null &&
        keys.includes(option.value_key),
    )
    .map((option) => option.label);
  // Fall back to the seed labels while the options are still loading.
  return labels.length > 0 ? labels : fallback;
}

/** Labels (as stored on `spaces.lokaltyp`) that mark a space as a group room. */
export function groupRoomLabels(options: FilterOption[]): string[] {
  return labelsForKeys(options, GROUP_ROOM_VALUE_KEYS, ["Grupprum"]);
}

/** Room-type labels that should not repeat in the card's meta row. */
export function cardHiddenRoomTypeLabels(options: FilterOption[]): string[] {
  return labelsForKeys(options, CARD_HIDDEN_ROOM_TYPE_KEYS, ["Grupprum", "Resursrum"]);
}

export function isGroupRoomSpace(space: Space, labels: string[]): boolean {
  if ((space.intent ?? []).includes("grupprum")) return true;
  return (space.lokaltyp ?? []).some((value) => labels.includes(value));
}
