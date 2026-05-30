import { X } from "lucide-react";
import { emptyFilters, type Filters } from "./FilterPanel";
import { useFilterCategories } from "@/lib/useFilterCategories";

const WORK_MODE_LABEL: Record<NonNullable<Filters["workMode"]>, string> = {
  enskilt: "Enskilt",
  tillsammans: "Tillsammans",
  grupprum: "I grupprum",
};

const GROUP_SIZE_LABEL: Record<NonNullable<Filters["groupSize"]>, string> = {
  "2-4": "2–4 pers",
  "5+": "5+ pers",
};

type Chip = { key: string; label: string; onRemove: () => void };

export function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const { data: categories = [] } = useFilterCategories();

  const chips: Chip[] = [];

  if (filters.query.trim()) {
    chips.push({
      key: "query",
      label: `Sök: "${filters.query.trim()}"`,
      onRemove: () => onChange({ ...filters, query: "" }),
    });
  }

  if (filters.workMode) {
    chips.push({
      key: "workMode",
      label: WORK_MODE_LABEL[filters.workMode],
      onRemove: () => onChange({ ...filters, workMode: null, groupSize: null }),
    });
  }

  if (filters.groupSize) {
    chips.push({
      key: "groupSize",
      label: GROUP_SIZE_LABEL[filters.groupSize],
      onRemove: () => onChange({ ...filters, groupSize: null }),
    });
  }

  for (const [catKey, values] of Object.entries(filters.byCategory)) {
    if (!values || values.length === 0) continue;
    for (const v of values) {
      chips.push({
        key: `${catKey}:${v}`,
        label: v,
        onRemove: () =>
          onChange({
            ...filters,
            byCategory: {
              ...filters.byCategory,
              [catKey]: values.filter((x) => x !== v),
            },
          }),
      });
    }
  }

  if (chips.length === 0) return null;

  // Reference categories so hook isn't unused if no by-category chips
  void categories;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          aria-label={`Ta bort filter: ${c.label}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-foreground border border-border pl-3 pr-2 py-1 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        >
          <span>{c.label}</span>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(emptyFilters)}
          className="text-xs font-medium text-[var(--kth-blue)] hover:underline ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded"
        >
          Rensa alla
        </button>
      )}
    </div>
  );
}
