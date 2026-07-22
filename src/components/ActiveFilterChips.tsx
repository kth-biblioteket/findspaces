import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { emptyFilters, type Filters } from "./FilterPanel";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { pickLocalized, type Lang } from "@/i18n";

type Chip = { key: string; label: string; onRemove: () => void };

export function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const { data: categories = [] } = useFilterCategories();
  const { data: options = [] } = useFilterOptions();
  const optLookup = new Map(options.map((o) => [`${o.category}:${o.label}`, o]));

  // Look up work-mode chip labels via the DB-backed "arbetssatt" category
  // (falls back to i18n if the DB row is missing).
  const arbetssattCat = categories.find((c) => c.special_kind === "arbetssatt");
  const arbetssattByKey = new Map(
    (arbetssattCat ? options.filter((o) => o.category === arbetssattCat.key) : [])
      .filter((o) => o.value_key)
      .map((o) => [o.value_key as string, o]),
  );
  const fallbackWorkMode: Record<string, string> = {
    enskilt: t("filters.intent_enskilt"),
    tillsammans: t("filters.intent_tillsammans"),
    grupprum: t("filters.intent_grupprum"),
  };
  const workModeLabel = (key: string) => {
    const opt = arbetssattByKey.get(key);
    return opt ? pickLocalized(opt, "label", lang) : (fallbackWorkMode[key] ?? key);
  };
  const groupSizeLabel: Record<NonNullable<Filters["groupSize"]>, string> = {
    "2-4": t("filters.group_size_2_4"),
    "5+": t("filters.group_size_5plus"),
  };

  const chips: Chip[] = [];

  if (filters.query.trim()) {
    chips.push({
      key: "query",
      label: t("chips.search_label", { query: filters.query.trim() }),
      onRemove: () => onChange({ ...filters, query: "" }),
    });
  }

  if (filters.workMode) {
    chips.push({
      key: "workMode",
      label: workModeLabel(filters.workMode),
      onRemove: () => onChange({ ...filters, workMode: null, groupSize: null, freeOnly: false }),
    });
  }

  if (filters.groupSize) {
    chips.push({
      key: "groupSize",
      label: groupSizeLabel[filters.groupSize],
      onRemove: () => onChange({ ...filters, groupSize: null }),
    });
  }

  if (filters.freeOnly) {
    chips.push({
      key: "freeOnly",
      label: t("filters.free_only"),
      onRemove: () => onChange({ ...filters, freeOnly: false }),
    });
  }


  for (const [catKey, values] of Object.entries(filters.byCategory)) {
    if (!values || values.length === 0) continue;
    for (const v of values) {
      const opt = optLookup.get(`${catKey}:${v}`);
      const display = opt ? pickLocalized(opt, "label", lang) : v;
      chips.push({
        key: `${catKey}:${v}`,
        label: display,
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
    <div
      role="group"
      aria-label={t("chips.active_filters")}
      className="mb-3 flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide"
    >
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          aria-label={t("chips.remove_aria", { label: c.label })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground border border-primary pl-3 pr-2 py-1 text-xs hover:opacity-90 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
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
          {t("filters.clear_all")}
        </button>
      )}
    </div>
  );
}

