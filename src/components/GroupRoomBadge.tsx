import { DoorOpen, DoorClosed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { GroupRoomStatus } from "@/lib/useGroupRoomAvailability";

const GROUP_ROOM_LABELS: Record<GroupRoomStatus, string> = {
  free: "group_room.free",
  busy: "group_room.busy",
  tentative: "group_room.tentative",
};

export function GroupRoomBadge({
  status,
  bookingUrl,
}: {
  status: GroupRoomStatus;
  bookingUrl?: string | null;
}) {
  const { t } = useTranslation();
  const Icon = status === "free" ? DoorOpen : DoorClosed;
  const dotClass =
    status === "free" ? "bg-emerald-500" : status === "tentative" ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
      <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden="true" />
      <span className="text-sm text-foreground">
        <span className="text-muted-foreground">{t("group_room.right_now")}:</span>{" "}
        <strong>{t(GROUP_ROOM_LABELS[status])}</strong>
      </span>

      {status === "free" && bookingUrl && (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-50 text-emerald-800 px-3 py-0.5 text-xs font-semibold hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 transition-colors"
        >
          <span>{t("card.book_now")}</span>
          <span aria-hidden="true">→</span>
          <span className="sr-only">{t("card.opens_new_tab_sr")}</span>
        </a>
      )}
    </div>
  );
}
