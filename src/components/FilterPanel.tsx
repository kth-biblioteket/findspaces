import { useState } from "react";
import { Search, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PillToggle } from "./PillToggle";
import { OptionIcon } from "./OptionIcon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useFilterOptions, groupOptionsByKey } from "@/lib/useFilterOptions";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { type FilterOption, type FilterCategoryRow, type SpaceKind } from "@/lib/spaces";
import { pickLocalized, type Lang } from "@/i18n";
import { cn } from "@/lib/utils";

export type WorkMode = string | null;
export type GroupSize = "2-4" | "5+" | null;

export type Filters = {
  query: string;
  spaceKind: SpaceKind;
  workMode: WorkMode;
  groupSize: GroupSize;
  freeOnly: boolean;
  byCategory: Record<string, string[]>;
};

export const emptyFilters: Filters = {
  query: "",
  spaceKind: "study",
  workMode: null,
  groupSize: null,
  freeOnly: false,
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

  const setSpaceKind = (kind: SpaceKind) => {
    if (filters.spaceKind === kind) return;
    onChange({
      ...filters,
      spaceKind: kind,
      // Switching mode resets study-only intent/group-room state and all
      // category selections, since filter categories rarely overlap between
      // study spaces and service locations.
      workMode: null,
      groupSize: null,
      freeOnly: false,
      byCategory: {},
    });
  };

  const setWorkMode = (mode: Exclude<WorkMode, null>) => {
    const next = filters.workMode === mode ? null : mode;
    onChange({
      ...filters,
      workMode: next,
      groupSize: next === "grupprum" ? filters.groupSize : null,
      freeOnly: next === "grupprum" ? filters.freeOnly : false,
    });
  };

  const setGroupSize = (size: GroupSize) => {
    onChange({
      ...filters,
      groupSize: filters.groupSize === size ? null : size,
    });
  };

  const setFreeOnly = (v: boolean) => {
    onChange({ ...filters, freeOnly: v });
  };


  // Read the two "special" categories from the DB. Labels, icons and order
  // are edited in admin; if a row is missing we silently omit the section.
  const spaceKindCat = categories.find((c) => c.special_kind === "space_kind");
  const arbetssattCat = categories.find((c) => c.special_kind === "arbetssatt");
  const spaceKindOpts = (spaceKindCat ? byKey[spaceKindCat.key] ?? [] : [])
    .filter((o) => !o.hidden && o.value_key);
  const arbetssattOpts = (arbetssattCat ? byKey[arbetssattCat.key] ?? [] : [])
    .filter((o) => !o.hidden && o.value_key);

  const isStudy = filters.spaceKind === "study";
  const isNonStudy = !isStudy;

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

      {spaceKindCat && spaceKindOpts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">{pickLocalized(spaceKindCat, "title", lang)}</h3>
          <div className="flex flex-wrap gap-2">
            {spaceKindOpts.map((o) => (
              <PillToggle
                key={o.id}
                label={pickLocalized(o, "label", lang)}
                icon={<OptionIcon option={o} className="h-4 w-4" />}
                selected={filters.spaceKind === o.value_key}
                onClick={() => setSpaceKind(o.value_key as SpaceKind)}
              />
            ))}
          </div>
        </div>
      )}

      {!isNonStudy && arbetssattCat && arbetssattOpts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">{pickLocalized(arbetssattCat, "title", lang)}</h3>
          <div className="flex flex-wrap gap-2">
            {arbetssattOpts.map((o) => (
              <PillToggle
                key={o.id}
                label={pickLocalized(o, "label", lang)}
                icon={<OptionIcon option={o} className="h-4 w-4" />}
                selected={filters.workMode === o.value_key}
                onClick={() => setWorkMode(o.value_key as string)}
              />
            ))}
          </div>


          {filters.workMode === "grupprum" && (
            <div className="mt-3 space-y-3">
              <div>
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
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.freeOnly}
                  onChange={(e) => setFreeOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--kth-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                />
                <span>{t("filters.free_only")}</span>
              </label>
            </div>
          )}

        </div>
      )}


      {categories.map((cat) => {
        if (cat.special_kind) return null;
        // In service / creative modes, hide all category filters — the
        // remaining browse UX is intentionally minimal.
        if (isNonStudy) return null;

        const opts = byKey[cat.key] ?? [];

        if (opts.length === 0) return null;
        const selected = filters.byCategory[cat.key] ?? [];
        const inner = cat.style === "list" ? (
          <ListGroup
            cat={cat}
            options={opts}
            selected={selected}
            onToggle={(v) => setSelected(cat.key, toggle(selected, v))}
            lang={lang}
            hideTitle
          />
        ) : (
          <PillGroup
            cat={cat}
            options={opts}
            selected={selected}
            onToggle={(v) => setSelected(cat.key, toggle(selected, v))}
            lang={lang}
            hideTitle
          />
        );

        // Noise stays always visible alongside intent; everything else is collapsible.
        if (cat.key === "noise") {
          return (
            <div key={cat.id}>
              <h3 className="text-sm font-semibold mb-3">{pickLocalized(cat, "title", lang)}</h3>
              {inner}
            </div>
          );
        }

        return (
          <CollapsibleSection
            key={cat.id}
            title={pickLocalized(cat, "title", lang)}
            defaultOpen={selected.length > 0 || isNonStudy}
            badgeCount={selected.length}
          >
            {inner}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}

function CollapsibleSection({
  title, defaultOpen = false, badgeCount = 0, children,
}: {
  title: string;
  defaultOpen?: boolean;
  badgeCount?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border pt-3">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left",
          "text-sm font-semibold cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded",
        )}
      >
        <span className="inline-flex items-center gap-2">
          {title}
          {badgeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[var(--kth-blue)] text-white text-[11px] font-semibold tabular-nums">
              {badgeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ListGroup({
  cat, options, selected, onToggle, lang, hideTitle = false,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
  lang: Lang;
  hideTitle?: boolean;
}) {
  return (
    <div>
      {!hideTitle && <h3 className="text-sm font-semibold mb-3">{pickLocalized(cat, "title", lang)}</h3>}
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
  cat, options, selected, onToggle, lang, hideTitle = false,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
  lang: Lang;
  hideTitle?: boolean;
}) {
  return (
    <div>
      {!hideTitle && <h3 className="text-sm font-semibold mb-3">{pickLocalized(cat, "title", lang)}</h3>}
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
