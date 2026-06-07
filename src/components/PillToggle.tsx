import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PillToggle({
  label, icon, selected, onClick,
}: { label: string; icon?: ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium border transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm [&_img]:brightness-0 [&_img]:invert"
          : "bg-secondary text-foreground border-transparent hover:bg-accent"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

