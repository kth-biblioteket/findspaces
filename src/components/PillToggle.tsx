import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PillToggle({
  label, icon: Icon, selected, onClick,
}: { label: string; icon?: LucideIcon; selected: boolean; onClick: () => void }) {
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
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </button>
  );
}
