import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Settings, X, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { type Space } from "@/lib/spaces";
import { useFilterCategories } from "@/lib/useFilterCategories";
import { FilterPanel, emptyFilters, type Filters } from "@/components/FilterPanel";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { SpaceCard } from "@/components/SpaceCard";
import { SpaceCardSkeleton } from "@/components/SpaceCardSkeleton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useUiText, formatSuggestTemplate } from "@/lib/useUiText";
import { matchesSpace } from "@/lib/filterMatch";
import { useNarrowestFilter } from "@/lib/useNarrowestFilter";
import { useFilterOptions } from "@/lib/useFilterOptions";
import { getGroupRoomAvailability } from "@/lib/groupRoomAvailability.functions";
import { track, usePageView, useDebouncedTrack } from "@/lib/analytics";

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import type { FilterCategoryRow } from "@/lib/spaces";

type SortKey = "recommended" | "seats_desc" | "free_now";

type SearchParams = {
  q: string;
  kind?: "service" | "creative";
  mode?: "enskilt" | "tillsammans" | "grupprum";
  size?: "2-4" | "5+";
  free?: boolean;
  highlight?: string;
  cats: Record<string, string[]>;
  sort?: SortKey;
};

function validateSearch(input: Record<string, unknown>): SearchParams {
  const q = typeof input.q === "string" ? input.q : "";
  const kind =
    input.kind === "service" || input.kind === "creative" ? input.kind : undefined;
  const modeRaw = input.mode;
  const mode =
    modeRaw === "enskilt" || modeRaw === "tillsammans" || modeRaw === "grupprum"
      ? modeRaw
      : undefined;
  const sizeRaw = input.size;
  const size = sizeRaw === "2-4" || sizeRaw === "5+" ? sizeRaw : undefined;
  const free = input.free === true || input.free === "1" || input.free === 1 ? true : undefined;
  const highlight = typeof input.highlight === "string" ? input.highlight : undefined;
  const cats: Record<string, string[]> = {};
  if (input.cats && typeof input.cats === "object" && !Array.isArray(input.cats)) {
    for (const [k, v] of Object.entries(input.cats as Record<string, unknown>)) {
      if (Array.isArray(v)) cats[k] = v.filter((x): x is string => typeof x === "string");
    }
  }
  const sortRaw = input.sort;
  const sort: SortKey | undefined =
    sortRaw === "seats_desc" || sortRaw === "free_now" || sortRaw === "recommended"
      ? sortRaw
      : undefined;
  return { q, kind, mode, size, free, highlight, cats, sort };
}


const spacesQueryOptions = queryOptions({
  queryKey: ["spaces"],
  queryFn: async (): Promise<Space[]> => {
    const { data, error } = await supabase.from("spaces").select("*").order("sort_order").order("name");
    if (error) throw error;
    return data as unknown as Space[];
  },
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hitta studieplats – KTH Biblioteket" },
      { name: "description", content: "Hitta rätt studieplats på KTH Biblioteket." },
    ],
  }),
  validateSearch,
  loader: ({ context }) => {
    // Prime the cache so the first paint has data available (no fetch waterfall
    // through useQuery). Fire-and-forget — the component keeps its own useQuery
    // for reactivity and per-request Suspense-free rendering.
    void context.queryClient.prefetchQuery(spacesQueryOptions);
  },
  component: SpaceFinder,
});

function searchToFilters(s: SearchParams): Filters {
  const kind = s.kind === "service" ? "service" : s.kind === "creative" ? "creative" : "study";
  return {
    query: s.q ?? "",
    spaceKind: kind,
    workMode: kind === "study" ? (s.mode ?? null) : null,
    groupSize: kind === "study" && s.mode === "grupprum" ? (s.size ?? null) : null,
    freeOnly: kind === "study" && s.mode === "grupprum" ? Boolean(s.free) : false,
    byCategory: s.cats ?? {},
  };
}

function filtersToSearch(f: Filters, highlight?: string) {
  const cats: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(f.byCategory)) {
    if (v && v.length > 0) cats[k] = v;
  }
  const isStudy = f.spaceKind === "study";
  const kind: "service" | "creative" | undefined =
    f.spaceKind === "service" ? "service" : f.spaceKind === "creative" ? "creative" : undefined;
  return {
    q: f.query.trim() ? f.query : undefined,
    kind,
    mode: isStudy ? (f.workMode ?? undefined) : undefined,
    size: isStudy && f.workMode === "grupprum" && f.groupSize ? f.groupSize : undefined,
    free: isStudy && f.workMode === "grupprum" && f.freeOnly ? true : undefined,
    highlight,
    cats: Object.keys(cats).length > 0 ? cats : undefined,
  };
}


function SpaceFinder() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "sv") as "sv" | "en";
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const filters = useMemo(() => searchToFilters(search), [search]);
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    try { setInIframe(window.self !== window.top); } catch { setInIframe(true); }
  }, []);


  const sort: SortKey = search.sort ?? "recommended";
  const canSortFree = filters.workMode === "grupprum";
  const effectiveSort: SortKey = sort === "free_now" && !canSortFree ? "recommended" : sort;

  const setFilters = (next: Filters) => {
    const nextSearch = filtersToSearch(next, search.highlight) as Record<string, unknown>;
    const nextMode = next.workMode;
    if (sort && sort !== "recommended" && !(sort === "free_now" && nextMode !== "grupprum")) {
      nextSearch.sort = sort;
    }
    navigate({ search: nextSearch as never, replace: true });
  };

  const setSort = (next: SortKey) => {
    navigate({
      search: (prev: SearchParams) => ({
        ...prev,
        sort: next === "recommended" ? undefined : next,
      }) as never,
      replace: true,
    });
  };


  const [highlightTick, setHighlightTick] = useState(0);

  const handleSpaceLink = (id: string) => {
    setHighlightTick((t) => t + 1);
    const target = spaces.find((s) => s.id === id || s.slug === id);
    const visible = target ? filtered.some((s) => s.id === target.id) : false;
    if (target && !visible) {
      navigate({ search: { q: "", highlight: id, cats: {} } as never, replace: true });
    } else {
      navigate({ search: (prev: SearchParams) => ({ ...prev, highlight: id }) as never, replace: true });
    }
  };

  const { data: spaces = [], isLoading } = useQuery(spacesQueryOptions);

  const { data: categories = [] } = useFilterCategories();
  const { data: emptyTitle } = useUiText("empty_title");
  const { data: emptySuggestTemplate } = useUiText("empty_suggest_template");
  const { data: emptyFallback } = useUiText("empty_fallback");

  const hasActiveFilter =
    filters.query.trim().length > 0 ||
    filters.workMode !== null ||
    Object.values(filters.byCategory).some((arr) => arr.length > 0);

  const { data: availability } = useQuery({
    queryKey: ["group-room-availability"],
    queryFn: () => getGroupRoomAvailability(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled:
      (filters.workMode === "grupprum" && filters.freeOnly) ||
      (filters.workMode === "grupprum" && effectiveSort === "free_now"),
  });

  const filtered = useMemo(() => {
    const kindMatched = spaces.filter((s) => (s.space_kind ?? "study") === filters.spaceKind);
    const base = kindMatched.filter((s) => matchesSpace(s, filters, categories));
    if (filters.workMode === "grupprum" && filters.freeOnly) {
      const rooms = availability?.rooms ?? {};
      return base.filter((s) => {
        const num = s.booking_room_number;
        if (num == null) return false;
        const r = rooms[String(num)];
        return r && !r.disabled && r.status === "free";
      });
    }
    return base;
  }, [spaces, filters, categories, availability]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    if (effectiveSort === "seats_desc") {
      arr.sort((a, b) => (b.capacity ?? -1) - (a.capacity ?? -1));
    } else if (effectiveSort === "free_now" && canSortFree) {
      const rooms = availability?.rooms ?? {};
      const rank = (s: Space) => {
        const num = s.booking_room_number;
        if (num == null) return 3;
        const r = rooms[String(num)];
        if (!r || r.disabled) return 3;
        if (r.status === "free") return 0;
        if (r.status === "tentative") return 1;
        if (r.status === "busy") return 2;
        return 3;
      };
      arr.sort((a, b) => rank(a) - rank(b));
    }
    return arr;
  }, [filtered, effectiveSort, canSortFree, availability]);



  const { data: filterOptions = [] } = useFilterOptions();
  const narrowest = useNarrowestFilter(spaces, filters, categories, filterOptions);

  usePageView("home");

  useDebouncedTrack(
    "filter_change",
    filters,
    (f) => ({
      query: f.query.trim() || undefined,
      workMode: f.workMode ?? undefined,
      groupSize: f.groupSize ?? undefined,
      freeOnly: f.freeOnly || undefined,
      categories: Object.fromEntries(
        Object.entries(f.byCategory).filter(([, v]) => v.length > 0),
      ),
    }),
  );

  useEffect(() => {
    if (!isLoading && hasActiveFilter && filtered.length === 0) {
      track("empty_results", {
        query: filters.query.trim() || undefined,
        workMode: filters.workMode ?? undefined,
        categories: Object.fromEntries(
          Object.entries(filters.byCategory).filter(([, v]) => v.length > 0),
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasActiveFilter, filtered.length]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold leading-tight">{t("header.title")}</h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label={t("header.admin")}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <AnnouncementBanner />



      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:grid lg:grid-cols-[320px_1fr] lg:gap-6">
        <aside className="hidden lg:block" aria-label={t("filters.title")}>
          <div
            className={
              inIframe
                ? "bg-card rounded-xl shadow-[0_4px_16px_-2px_rgba(15,23,42,0.12),0_2px_6px_-2px_rgba(15,23,42,0.08)] flex flex-col"
                : "sticky top-4 bg-card rounded-xl shadow-[0_4px_16px_-2px_rgba(15,23,42,0.12),0_2px_6px_-2px_rgba(15,23,42,0.08)] flex flex-col max-h-[calc(100vh-2rem)]"
            }
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold">{t("filters.title")}</span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => setFilters(emptyFilters)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--kth-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("filters.clear_all")}
                </button>
              )}
            </div>
            <div className={inIframe ? "px-4 py-4" : "overflow-y-auto px-4 py-4 min-h-0"}>
              <FilterPanel filters={filters} onChange={setFilters} />
            </div>
          </div>
        </aside>


        <div className="lg:hidden mb-4">
          <MobileFilterSheet
            filters={filters}
            onApply={setFilters}
            spaces={spaces}
            categories={categories}
            availability={availability}
          />
        </div>


        <main id="main" tabIndex={-1} className="focus-visible:outline-none" aria-busy={isLoading}>
          {(isLoading || hasActiveFilter) && (
            <div
              className="flex items-baseline justify-end mb-3"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-xs text-muted-foreground">
                {isLoading
                  ? t("results.loading")
                  : t("results.count_filtered", { filtered: filtered.length, total: spaces.length })}
              </span>
            </div>
          )}

          <ActiveFilterChips filters={filters} onChange={setFilters} />

          {isLoading && (
            <div className="space-y-3 md:space-y-5" role="status" aria-label={t("results.loading")}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SpaceCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="bg-card rounded-2xl shadow-sm p-8 text-left">
              <p className="text-base font-semibold text-foreground mb-2 whitespace-pre-line">
                {emptyTitle}
              </p>
              {narrowest && narrowest.wouldMatch > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
                    {formatSuggestTemplate(emptySuggestTemplate ?? "", {
                      label: narrowest.label,
                      count: narrowest.wouldMatch,
                    }, lang)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFilters(narrowest.remove(filters))}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      {t("results.remove_filter", { label: narrowest.label })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilters(emptyFilters)}
                      className="inline-flex items-center rounded-full border border-border bg-card text-foreground px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                    >
                      {t("results.clear_all_filters")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
                    {emptyFallback}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(emptyFilters)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                  >
                    {t("results.clear_all_filters")}
                  </button>
                </>
              )}
            </div>
          )}
          {!isLoading && (
            <div className="space-y-3 md:space-y-5">
              {filtered.map((s, i) => (
                <SpaceCard key={s.id} space={s} filters={filters} onFiltersChange={setFilters} onSpaceLink={handleSpaceLink} highlightId={search.highlight} highlightTick={highlightTick} spaces={spaces} priority={i < 2} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MobileFilterSheet({
  filters,
  onApply,
  spaces,
  categories,
  availability,
}: {
  filters: Filters;
  onApply: (f: Filters) => void;
  spaces: Space[];
  categories: FilterCategoryRow[];
  availability: { rooms: Record<string, { status: string; disabled?: boolean }> } | undefined;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const draftCount = useMemo(() => {
    const cats = categories ?? [];
    const base = spaces.filter((s) => matchesSpace(s, draft, cats));
    if (draft.workMode === "grupprum" && draft.freeOnly) {
      const rooms = availability?.rooms ?? {};
      return base.filter((s) => {
        const num = s.booking_room_number;
        if (num == null) return false;
        const r = rooms[String(num)];
        return r && !r.disabled && r.status === "free";
      }).length;
    }
    return base.length;
  }, [spaces, draft, categories, availability]);

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {t("filters.open")}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col overflow-hidden gap-0">
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0">
          <SheetTitle>{t("filters.title")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="px-6 pb-6 pt-4">
            <FilterPanel filters={draft} onChange={setDraft} />
          </div>
          <div className="sticky bottom-0 mt-auto border-t border-border bg-card p-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraft(emptyFilters)}
              className="px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              {t("filters.clear")}
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              {t("filters.show_results_count", { count: draftCount })}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

