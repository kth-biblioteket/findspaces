import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useUiText } from "@/lib/useUiText";
import type { OccupancyStatus } from "@/lib/useOccupancy";

const OCCUPANCY_TEXT_KEYS: Record<OccupancyStatus, "occupancy_free" | "occupancy_moderate" | "occupancy_busy"> = {
  free: "occupancy_free",
  moderate: "occupancy_moderate",
  busy: "occupancy_busy",
};

const OCCUPANCY_FALLBACK_I18N: Record<OccupancyStatus, string> = {
  free: "occupancy.free",
  moderate: "occupancy.moderate",
  busy: "occupancy.busy",
};

function OccupancyBlocks({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-[2px]" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn("w-5 h-2 rounded-sm", i <= level ? "bg-[var(--kth-blue)]" : "bg-muted")}
        />
      ))}
    </div>
  );
}

export function OccupancyBadge({ level, status }: { level: 1 | 2 | 3; status: OccupancyStatus }) {
  const { t } = useTranslation();
  const { data: customLabel } = useUiText(OCCUPANCY_TEXT_KEYS[status]);
  const label = customLabel ?? t(OCCUPANCY_FALLBACK_I18N[status]);
  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <Users className="h-4 w-4 text-foreground" aria-hidden="true" />
      <OccupancyBlocks level={level} />
      <span className="text-sm text-foreground">
        <span className="text-muted-foreground">{t("occupancy.right_now")}:</span> <strong>{label}</strong>
      </span>
    </div>
  );
}
