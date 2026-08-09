import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { OccupancyStatus } from "@/lib/useOccupancy";

const OCCUPANCY_I18N_KEYS: Record<OccupancyStatus, string> = {
  free: "occupancy.free",
  moderate: "occupancy.moderate",
  busy: "occupancy.busy",
};

function OccupancyPeople({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex h-4 shrink-0 items-center -space-x-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <User
          key={i}
          className={cn(
            "h-4 w-4",
            i <= level
              ? "text-[var(--kth-blue)] fill-current"
              : "text-black"
          )}
        />
      ))}
    </div>
  );
}

export function OccupancyBadge({ level, status }: { level: 1 | 2 | 3; status: OccupancyStatus }) {
  const { t } = useTranslation();
  const label = t(OCCUPANCY_I18N_KEYS[status]);
  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <OccupancyPeople level={level} />
      <span className="text-sm leading-tight text-foreground">
        <span className="text-muted-foreground">{t("occupancy.right_now")}:</span> <strong>{label}</strong>
      </span>
    </div>
  );
}
