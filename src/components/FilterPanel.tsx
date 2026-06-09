import { Search, Check, User, Users, DoorClosed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PillToggle } from "./PillToggle";
import { OptionIcon } from "./OptionIcon";
import { useFilterOptions, groupOptionsByKey } from "@/lib/useFilterOptions";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { type FilterOption, type FilterCategoryRow } from "@/lib/spaces";
import { pickLocalized, type Lang } from "@/i18n";
import { cn } from "@/lib/utils";

export type WorkMode = "enskilt" | "tillsammans" | "grupprum" | null;
export type GroupSize = "2-4" | "5+" | null;

export type Filters = {
  query: string;
  workMode: WorkMode;
  groupSize: GroupSize;
  byCategory: Record<string, string[]>;
};

export const emptyFilters: Filters = {
  query: "",
  workMode: null,
  groupSize: null,
  byCategory: {},
};

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterPanel({
  filters, onChange,
}: { filters: Filters; onChange: (f: Filters) => void }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as Lang;
  const { data: options = [] } = useFilterOptions();
  const { data: categories = [] } = useFilterCategories();
  const byKey = groupOptionsByKey(options);

  const setSelected = (key: string, values: string[]) => {
    onChange({ ...filters, byCategory: { ...filters.byCategory, [key]: values } });
  };

  const setWorkMode = (mode: Exclude<WorkMode, null>) => {
    const next = filters.workMode === mode ? null : mode;
    onChange({
      ...filters,
      workMode: next,
      groupSize: next === "grupprum" ? filters.groupSize : null,
    });
  };

  const setGroupSize = (size: GroupSize) => {
    onChange({
      ...filters,
      groupSize: filters.groupSize === size ? null : size,
    });
  };

  // Intent section is hard-coded in the student view, so the title should
  // always come from the translation file (not the DB).
  const intentTitle = t("filters.intent_default_title");

  const intentTabs: { key: Exclude<WorkMode, null>; label: string; Icon: typeof User }[] = [
    { key: "enskilt", label: t("filters.intent_enskilt"), Icon: User },
    { key: "tillsammans", label: t("filters.intent_tillsammans"), Icon: Users },
    { key: "grupprum", label: t("filters.intent_grupprum"), Icon: DoorClosed },
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className="relative block">
          <span className="sr-only">{t("filters.search_sr")}</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder={t("filters.search_placeholder")}
            className="w-full rounded-full border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          />
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">{intentTitle}</h3>
        <div className="flex flex-wrap gap-2">
          {intentTabs.map(({ key, label, Icon }) => (
            <PillToggle
              key={key}
              label={label}
              icon={<Icon className="h-4 w-4" />}
              selected={filters.workMode === key}
              onClick={() => setWorkMode(key)}
            />
          ))}
        </div>


        {filters.workMode === "grupprum" && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">{t("filters.group_size_label")}</p>
            <div className="flex flex-wrap gap-2">
              <PillToggle
                label={t("filters.group_size_2_4")}
                selected={filters.groupSize === "2-4"}
                onClick={() => setGroupSize("2-4")}
              />
              <PillToggle
                label={t("filters.group_size_5plus")}
                selected={filters.groupSize === "5+"}
                onClick={() => setGroupSize("5+")}
              />
            </div>
          </div>
        )}
      </div>


      {categories.map((cat) => {
        if (cat.key === "intent") return null;
        const opts = byKey[cat.key] ?? [];

        if (opts.length === 0) return null;
        const selected = filters.byCategory[cat.key] ?? [];
        return cat.style === "list" ? (
          <ListGroup
            key={cat.id}
            cat={cat}
            options={opts}
            selected={selected}
            onToggle={(v) => setSelected(cat.key, toggle(selected, v))}
            lang={lang}
          />
        ) : (
          <PillGroup
            key={cat.id}
            cat={cat}
            options={opts}
            selected={selected}
            onToggle={(v) => setSelected(cat.key, toggle(selected, v))}
            lang={lang}
          />
        );
      })}
    </div>
  );
}

function ListGroup({
  cat, options, selected, onToggle, lang,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
  lang: Lang;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{pickLocalized(cat, "title", lang)}</h3>
      <ul className="space-y-1">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.label);
          const display = pickLocalized(opt, "label", lang);
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onToggle(opt.label)}
                aria-pressed={isSelected}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
                  isSelected
                    ? "bg-primary text-primary-foreground [&_img]:brightness-0 [&_img]:invert"
                    : "hover:bg-accent text-foreground"
                )}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center shrink-0">
                  <Check
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-25"
                    )}
                  />
                </span>

                <OptionIcon option={opt} className="h-4 w-4" />
                <span>{display}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PillGroup({
  cat, options, selected, onToggle, lang,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
  lang: Lang;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{pickLocalized(cat, "title", lang)}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <PillToggle
            key={o.id}
            label={pickLocalized(o, "label", lang)}
            icon={<OptionIcon option={o} className="h-4 w-4" />}
            selected={selected.includes(o.label)}
            onClick={() => onToggle(o.label)}
          />
        ))}
      </div>
    </div>
  );
}
