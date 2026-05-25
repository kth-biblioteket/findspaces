import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PillToggle({
  label, icon, selected, onClick,
}: { label: string; icon?: ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium border transition-all",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-secondary text-foreground border-transparent hover:bg-accent"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
