import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Library, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Space, getSpaceValues } from "@/lib/spaces";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { FilterPanel, emptyFilters, type Filters } from "@/components/FilterPanel";
import { SpaceCard } from "@/components/SpaceCard";
import { useLandingMessage } from "@/lib/useLandingMessage";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hitta studieplats demo" },
      { name: "description", content: "Hitta rätt studieplats på KTH Biblioteket." },
    ],
  }),
  component: SpaceFinder,
});

function SpaceFinder() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase.from("spaces").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data as unknown as Space[];
    },
  });

  const { data: categories = [] } = useFilterCategories();
  const { data: landingMessage } = useLandingMessage();

  const hasActiveFilter =
    filters.query.trim().length > 0 ||
    filters.workMode !== null ||
    Object.values(filters.byCategory).some((arr) => arr.length > 0);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return spaces.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !(s.lokaltyp ?? []).some((l) => l.toLowerCase().includes(q)))
        return false;

      // Arbetssätt
      if (filters.workMode === "grupprum") {
        if (!(s.lokaltyp ?? []).includes("Grupprum") && !(s.intent ?? []).includes("grupprum")) return false;
        if (filters.groupSize) {
          const cap = s.capacity ?? 0;
          if (filters.groupSize === "5+") {
            if (cap < 5) return false;
          } else {
            if (cap < 2 || cap > 4) return false;
          }
        }
      } else if (filters.workMode === "enskilt" || filters.workMode === "tillsammans") {
        if (!(s.intent ?? []).includes(filters.workMode)) return false;
      }

      for (const cat of categories) {
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
  }, [spaces, filters, categories]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--kth-navy)] flex items-center justify-center">
              <Library className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold leading-tight">Hitta studieplats på KTH Biblioteket</h1>
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 border border-amber-300">
                  Prototyp
                </span>
              </div>
              <p className="text-xs text-muted-foreground">DEMO</p>
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
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filter
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-2 shrink-0">
                <SheetTitle>Filter</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                <FilterPanel filters={filters} onChange={setFilters} />
              </div>
              <div className="shrink-0 border-t border-border bg-white p-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFilters(emptyFilters)}
                  className="px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  Rensa
                </button>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                  >
                    Visa resultat{hasActiveFilter ? ` (${filtered.length})` : ""}
                  </button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <main>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold">Studieplatser</h2>
            <span className="text-sm text-muted-foreground">
              {isLoading
                ? "Laddar..."
                : hasActiveFilter
                  ? `${filtered.length} av ${spaces.length}`
                  : `${spaces.length} lokaler`}
            </span>
          </div>

          {!hasActiveFilter ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground whitespace-pre-line">
              {landingMessage}
            </div>
          ) : (
            <>
              {!isLoading && filtered.length === 0 && (
                <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
                  Inga lokaler matchar dina filter.
                </div>
              )}
              <div className="space-y-3">
                {filtered.map((s) => (
                  <SpaceCard key={s.id} space={s} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
