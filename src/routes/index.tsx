import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Library, Settings, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Space } from "@/lib/spaces";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { FilterPanel, emptyFilters, type Filters } from "@/components/FilterPanel";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { SpaceCard } from "@/components/SpaceCard";
import { useLandingMessage } from "@/lib/useLandingMessage";
import { useUiText, formatSuggestTemplate } from "@/lib/useUiText";
import { matchesSpace } from "@/lib/filterMatch";
import { useNarrowestFilter } from "@/lib/useNarrowestFilter";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

type SearchParams = {
  q: string;
  mode?: "enskilt" | "tillsammans" | "grupprum";
  size?: "2-4" | "5+";
  cats: Record<string, string[]>;
};

function validateSearch(input: Record<string, unknown>): SearchParams {
  const q = typeof input.q === "string" ? input.q : "";
  const modeRaw = input.mode;
  const mode =
    modeRaw === "enskilt" || modeRaw === "tillsammans" || modeRaw === "grupprum"
      ? modeRaw
      : undefined;
  const sizeRaw = input.size;
  const size = sizeRaw === "2-4" || sizeRaw === "5+" ? sizeRaw : undefined;
  const cats: Record<string, string[]> = {};
  if (input.cats && typeof input.cats === "object" && !Array.isArray(input.cats)) {
    for (const [k, v] of Object.entries(input.cats as Record<string, unknown>)) {
      if (Array.isArray(v)) cats[k] = v.filter((x): x is string => typeof x === "string");
    }
  }
  return { q, mode, size, cats };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hitta studieplats demo" },
      { name: "description", content: "Hitta rätt studieplats på KTH Biblioteket." },
    ],
  }),
  validateSearch,
  component: SpaceFinder,
});

function searchToFilters(s: { q: string; mode?: "enskilt" | "tillsammans" | "grupprum"; size?: "2-4" | "5+"; cats: Record<string, string[]> }): Filters {
  return {
    query: s.q ?? "",
    workMode: s.mode ?? null,
    groupSize: s.mode === "grupprum" ? (s.size ?? null) : null,
    byCategory: s.cats ?? {},
  };
}

function filtersToSearch(f: Filters) {
  const cats: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(f.byCategory)) {
    if (v && v.length > 0) cats[k] = v;
  }
  return {
    q: f.query.trim() ? f.query : undefined,
    mode: f.workMode ?? undefined,
    size: f.workMode === "grupprum" && f.groupSize ? f.groupSize : undefined,
    cats: Object.keys(cats).length > 0 ? cats : undefined,
  };
}

function SpaceFinder() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const filters = useMemo(() => searchToFilters(search), [search]);

  const setFilters = (next: Filters) => {
    navigate({ search: filtersToSearch(next) as never, replace: true });
  };

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
  const { data: emptyTitle } = useUiText("empty_title");
  const { data: emptySuggestTemplate } = useUiText("empty_suggest_template");
  const { data: emptyFallback } = useUiText("empty_fallback");

  const hasActiveFilter =
    filters.query.trim().length > 0 ||
    filters.workMode !== null ||
    Object.values(filters.byCategory).some((arr) => arr.length > 0);

  const filtered = useMemo(
    () => spaces.filter((s) => matchesSpace(s, filters, categories)),
    [spaces, filters, categories]
  );

  const narrowest = useNarrowestFilter(spaces, filters, categories);

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
            <div className="flex items-center justify-between mb-4 min-h-[28px]">
              <span className="text-sm font-semibold">Filter</span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => setFilters(emptyFilters)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--kth-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Rensa alla
                </button>
              )}
            </div>
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

          <ActiveFilterChips filters={filters} onChange={setFilters} />

          {!hasActiveFilter ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-left text-muted-foreground whitespace-pre-line">
              {landingMessage}
            </div>
          ) : (
            <>
              {!isLoading && filtered.length === 0 && (
                <div className="bg-card rounded-2xl border border-border p-8 text-left">
                  <p className="text-base font-semibold text-foreground mb-2">
                    Inga lokaler matchar dina filter.
                  </p>
                  {narrowest && narrowest.wouldMatch > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">
                        Filtret <span className="font-medium text-foreground">{narrowest.label}</span> verkar smalast — om du tar bort det hittar vi{" "}
                        <span className="font-medium text-foreground">{narrowest.wouldMatch}</span>{" "}
                        {narrowest.wouldMatch === 1 ? "lokal" : "lokaler"}.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFilters(narrowest.remove(filters))}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Ta bort {narrowest.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilters(emptyFilters)}
                          className="inline-flex items-center rounded-full border border-border bg-card text-foreground px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                        >
                          Rensa alla filter
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">
                        Prova att rensa filtren och börja om.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFilters(emptyFilters)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                      >
                        Rensa alla filter
                      </button>
                    </>
                  )}
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
