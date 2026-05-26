import { Search, Check } from "lucide-react";
import { PillToggle } from "./PillToggle";
import { OptionIcon } from "./OptionIcon";
import { useFilterOptions, groupOptions } from "@/lib/useFilterOptions";
import { useCategoryTitles } from "@/lib/useSettings";
import { DEFAULT_CATEGORY_TITLES, type FilterOption } from "@/lib/spaces";
import { cn } from "@/lib/utils";

export type Filters = {
  query: string;
  intent: string[];
  noise: string[];
  equipment: string[];
  facilities: string[];
  lokaltyp: string[];
};

export const emptyFilters: Filters = {
  query: "", intent: [], noise: [], equipment: [], facilities: [], lokaltyp: [],
};

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterPanel({
  filters, onChange,
}: { filters: Filters; onChange: (f: Filters) => void }) {
  const { data: options = [] } = useFilterOptions();
  const { data: titles } = useCategoryTitles();
  const groups = groupOptions(options);
  const t = titles ?? DEFAULT_CATEGORY_TITLES;

  return (
    <div className="space-y-7">
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
        <h3 className="text-sm font-semibold mb-3">{t.intent}</h3>
        <ul className="space-y-1">
          {groups.intent.map((opt) => {
            const selected = filters.intent.includes(opt.label);
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, intent: toggle(filters.intent, opt.label) })}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center shrink-0">
                    {selected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="h-3 w-3 rounded-full border border-current opacity-30" />
                    )}
                  </span>
                  <OptionIcon option={opt} className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <FilterGroup
        title={t.noise}
        options={groups.noise}
        selected={filters.noise}
        onToggle={(v) => onChange({ ...filters, noise: toggle(filters.noise, v) })}
      />
      <FilterGroup
        title={t.lokaltyp}
        options={groups.lokaltyp}
        selected={filters.lokaltyp}
        onToggle={(v) => onChange({ ...filters, lokaltyp: toggle(filters.lokaltyp, v) })}
      />
      <FilterGroup
        title={t.equipment}
        options={groups.equipment}
        selected={filters.equipment}
        onToggle={(v) => onChange({ ...filters, equipment: toggle(filters.equipment, v) })}
      />
      <FilterGroup
        title={t.facility}
        options={groups.facility}
        selected={filters.facilities}
        onToggle={(v) => onChange({ ...filters, facilities: toggle(filters.facilities, v) })}
      />
    </div>
  );
}

function FilterGroup({
  title, options, selected, onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
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
