import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOpeningHoursSchedule } from "./openingHoursSchedule.functions";

/** Fetches ~6 months of opening hours (Swedish) for the admin view. */
export function useOpeningHoursSchedule() {
  const fetchSchedule = useServerFn(getOpeningHoursSchedule);
  return useQuery({
    queryKey: ["opening-hours", "schedule"],
    queryFn: () => fetchSchedule(),
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
