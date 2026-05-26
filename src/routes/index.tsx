import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Library, Settings, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Space, getSpaceValues } from "@/lib/spaces";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { FilterPanel, emptyFilters, type Filters } from "@/components/FilterPanel";
import { SpaceCard } from "@/components/SpaceCard";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

type TopIntent = "single" | "group" | null;
type GroupSize = "small" | "large" | null;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KTH Biblioteket — Hitta studieplats" },
      { name: "description", content: "Hitta rätt studieplats på KTH Biblioteket — filtrera efter ljudnivå, utrustning och faciliteter." },
    ],
  }),
  component: SpaceFinder,
});

function SpaceFinder() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [topIntent, setTopIntent] = useState<TopIntent>(null);
  const [groupSize, setGroupSize] = useState<GroupSize>(null);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase
        .from("spaces").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data as unknown as Space[];
    },
  });

  const { data: categories = [] } = useFilterCategories();

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return spaces.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !(s.lokaltyp ?? []).some((l) => l.toLowerCase().includes(q))) return false;

      // Top-level intent: single vs group based on capacity
      const cap = s.capacity;
      if (topIntent === "single") {
        if (cap != null && cap > 1) return false;
      } else if (topIntent === "group") {
        if (cap == null || cap < 2) return false;
        if (groupSize === "small" && !(cap >= 2 && cap <= 4)) return false;
        if (groupSize === "large" && !(cap >= 5)) return false;
      }

      for (const cat of categories) {
        if (cat.key === "intent") continue;
        const selected = filters.byCategory[cat.key] ?? [];
        if (selected.length === 0) continue;
        const values = getSpaceValues(s, cat.key);
        if (cat.match_mode === "all") {
          if (!selected.every((v) => values.includes(v))) return false;
        } else {
          if (!selected.some((v) => values.includes(v))) return false;
        }
      }
      return true;
    });
  }, [spaces, filters, categories, topIntent, groupSize]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--kth-navy)] flex items-center justify-center">
              <Library className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">KTH Biblioteket</h1>
              <p className="text-xs text-muted-foreground">Hitta din studieplats</p>
            </div>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[320px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-6 bg-card rounded-2xl border border-border p-6">
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="lg:hidden mb-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterPanel filters={filters} onChange={setFilters} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <main>
          {/* Top-level intent bar */}
          <div className="mb-4 bg-card rounded-2xl border border-border p-2 grid grid-cols-2 gap-2">
            <IntentButton
              icon={<User className="h-5 w-5" />}
              label="Enskilt"
              active={topIntent === "single"}
              onClick={() => {
                setTopIntent(topIntent === "single" ? null : "single");
                setGroupSize(null);
              }}
            />
            <IntentButton
              icon={<Users className="h-5 w-5" />}
              label="Grupparbete"
              active={topIntent === "group"}
              onClick={() =>
                setTopIntent(topIntent === "group" ? null : "group")
              }
            />
          </div>

          {/* Conditional group size */}
          {topIntent === "group" && (
            <div className="mb-4 bg-card rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold mb-3">Gruppstorlek</h3>
              <div className="flex flex-wrap gap-2">
                <SizePill
                  label="2–4 pers"
                  active={groupSize === "small"}
                  onClick={() => setGroupSize(groupSize === "small" ? null : "small")}
                />
                <SizePill
                  label="5+ pers"
                  active={groupSize === "large"}
                  onClick={() => setGroupSize(groupSize === "large" ? null : "large")}
                />
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold">Studieplatser</h2>
            <span className="text-sm text-muted-foreground">
              {isLoading ? "Laddar..." : `${filtered.length} av ${spaces.length}`}
            </span>
          </div>

          {!isLoading && filtered.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
              Inga lokaler matchar dina filter.
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((s) => <SpaceCard key={s.id} space={s} />)}
          </div>
        </main>
      </div>
    </div>
  );
}

function IntentButton({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
        active
          ? "bg-[var(--kth-navy)] text-white"
          : "bg-secondary text-foreground hover:bg-accent"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SizePill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}
