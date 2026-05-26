import { resolveIcon, type FilterOption } from "@/lib/spaces";
import { cn } from "@/lib/utils";

export function OptionIcon({
  option,
  className,
}: {
  option: Pick<FilterOption, "icon_url" | "default_icon"> | null | undefined;
  className?: string;
}) {
  if (!option) return null;
  const r = resolveIcon(option);
  if (!r) return null;
  if (r.type === "lucide") {
    const Icon = r.Icon;
    return <Icon className={cn("text-black", className)} />;
  }
  return <img src={r.url} alt="" className={cn("object-contain", className)} />;
}
