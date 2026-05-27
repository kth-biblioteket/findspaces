import { Search, Check, User, Users, DoorClosed } from "lucide-react";
import { PillToggle } from "./PillToggle";
import { OptionIcon } from "./OptionIcon";
import { useFilterOptions, groupOptionsByKey } from "@/lib/useFilterOptions";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { type FilterOption, type FilterCategoryRow } from "@/lib/spaces";
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

const INTENT_TABS: { key: Exclude<WorkMode, null>; label: string; Icon: typeof User }[] = [
  { key: "enskilt", label: "Enskilt", Icon: User },
  { key: "tillsammans", label: "Tillsammans", Icon: Users },
  { key: "grupprum", label: "I grupprum", Icon: DoorClosed },
];

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterPanel({
  filters, onChange,
}: { filters: Filters; onChange: (f: Filters) => void }) {
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

  const intentTitle = categories.find((c) => c.key === "intent")?.title ?? "Jag vill arbeta";

  return (
    <div className="space-y-10">
      <div>
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Sök på lokal..."
            className="w-full rounded-full border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">{intentTitle}</h3>
        <div className="grid grid-cols-3 rounded-full border border-border bg-card p-1">
          {INTENT_TABS.map(({ key, label, Icon }) => {
            const active = filters.workMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setWorkMode(key)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {filters.workMode === "grupprum" && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Gruppstorlek</p>
            <div className="flex flex-wrap gap-2">
              <PillToggle
                label="2–4 pers"
                selected={filters.groupSize === "2-4"}
                onClick={() => setGroupSize("2-4")}
              />
              <PillToggle
                label="5+ pers"
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
          />
        ) : (
          <PillGroup
            key={cat.id}
            cat={cat}
            options={opts}
            selected={selected}
            onToggle={(v) => setSelected(cat.key, toggle(selected, v))}
          />
        );
      })}
    </div>
  );
}

function ListGroup({
  cat, options, selected, onToggle,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{cat.title}</h3>
      <ul className="space-y-1">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.label);
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onToggle(opt.label)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2",
                  isSelected
                    ? "bg-primary text-primary-foreground"
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
                <span>{opt.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PillGroup({
  cat, options, selected, onToggle,
}: {
  cat: FilterCategoryRow;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{cat.title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <PillToggle
            key={o.id}
            label={o.label}
            icon={<OptionIcon option={o} className="h-4 w-4" />}
            selected={selected.includes(o.label)}
            onClick={() => onToggle(o.label)}
          />
        ))}
      </div>
    </div>
  );
}
