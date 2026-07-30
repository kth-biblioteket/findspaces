import { useEffect, useState } from "react";
import { useOccupancySettings, isWithinSchedule, DEFAULT_SCHEDULE } from "./useOccupancySettings";

/**
 * True while live availability data should be shown, re-evaluated on a timer
 * so long-lived screens (kiosks, embedded iframes) follow the schedule as it
 * opens and closes instead of freezing on the value from first render.
 */
export function useLiveActive(): boolean {
  const { data: occSettings } = useOccupancySettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
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

  return (
    (occSettings?.enabled ?? true) &&
    isWithinSchedule(occSettings?.schedule ?? DEFAULT_SCHEDULE, now)
  );
}
