import { useEffect, useState } from "react";
import { useOccupancySettings } from "./useOccupancySettings";
import { useOpeningHours, isOpenNow } from "./useOpeningHours";

/**
 * True while live availability data should be shown. Opening hours come from
 * the KTH library API (see `useOpeningHours`) and are re-evaluated on a timer
 * so long-lived screens (for example kiosks) follow the schedule as it
 * opens and closes instead of freezing on the value from first render.
 *
 * If the API is unavailable the hook fails open, so students still get the
 * occupancy meter and time-dependent filters.
 */
export function useLiveActive(): boolean {
  const { data: occSettings } = useOccupancySettings();
  const { data: openingHours } = useOpeningHours();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Guarded so the hook is safe to call during SSR/prerender too.
    if (typeof window === "undefined") return;
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);


  return (occSettings?.enabled ?? true) && isOpenNow(openingHours, now);
}
