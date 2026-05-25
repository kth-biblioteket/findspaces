import { Search } from "lucide-react";
import { PillToggle } from "./PillToggle";
import {
  INTENT_OPTIONS, NOISE_OPTIONS, EQUIPMENT_OPTIONS, FACILITY_OPTIONS,
} from "@/lib/spaces";
import { cn } from "@/lib/utils";

export type Filters = {
  query: string;
  intent: string[];
  noise: string[];
  equipment: string[];
  facilities: string[];
};

export const emptyFilters: Filters = {
  query: "", intent: [], noise: [], equipment: [], facilities: [],
};

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterPanel({
  filters, onChange,
}: { filters: Filters; onChange: (f: Filters) => void }) {
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
        <h3 className="text-sm font-semibold mb-3">Jag vill arbeta</h3>
        <ul className="space-y-1">
          {INTENT_OPTIONS.map((opt) => {
            const selected = filters.intent.includes(opt);
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, intent: toggle(filters.intent, opt) })}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <FilterGroup
        title="Ljudnivå"
        options={NOISE_OPTIONS}
        selected={filters.noise}
        onToggle={(v) => onChange({ ...filters, noise: toggle(filters.noise, v) })}
      />
      <FilterGroup
        title="Utrustning"
        options={EQUIPMENT_OPTIONS}
        selected={filters.equipment}
        onToggle={(v) => onChange({ ...filters, equipment: toggle(filters.equipment, v) })}
      />
      <FilterGroup
        title="Faciliteter"
        options={FACILITY_OPTIONS}
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
  options: { label: string; icon: any }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <PillToggle
            key={o.label}
            label={o.label}
            icon={o.icon}
            selected={selected.includes(o.label)}
            onClick={() => onToggle(o.label)}
          />
        ))}
      </div>
    </div>
  );
}
