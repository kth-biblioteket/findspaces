import { useQuery } from "@tanstack/react-query";
import { getGroupRoomAvailability } from "./groupRoomAvailability.functions";

export type GroupRoomStatus = "free" | "busy";

export type GroupRoomState = {
  status: GroupRoomStatus;
  updatedAt: Date | null;
};

function useAvailability() {
  return useQuery({
    queryKey: ["group-room-availability"],
    queryFn: () => getGroupRoomAvailability(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useGroupRoomAvailability(
  roomNumber: number | null | undefined,
): GroupRoomState | null {
  const { data } = useAvailability();
  if (roomNumber == null) return null;
  const room = data?.rooms?.[String(roomNumber)];
  if (!room || room.disabled) return null;
  return {
    status: room.available ? "free" : "busy",
    updatedAt: data?.lastUpdated ? new Date(data.lastUpdated) : null,
  };
}
