import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: number;
  event_type: string;
  payload: Record<string, unknown> | null;
  session_id: string | null;
  path: string | null;
  created_at: string;
};

const RANGES = [
  { key: "24h", label: "24 timmar", hours: 24 },
  { key: "7d", label: "7 dagar", hours: 24 * 7 },
  { key: "30d", label: "30 dagar", hours: 24 * 30 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

export function AnalyticsTab() {
  const [range, setRange] = useState<RangeKey>("7d");

  const since = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    return new Date(Date.now() - r.hours * 3600 * 1000).toISOString();
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics_events", range],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("id,event_type,payload,session_id,path,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 30_000,
  });

  const rows = data ?? [];

  const totals = useMemo(() => {
    const byType: Record<string, number> = {};
    const sessions = new Set<string>();
    for (const r of rows) {
      byType[r.event_type] = (byType[r.event_type] ?? 0) + 1;
      if (r.session_id) sessions.add(r.session_id);
    }
    return { byType, total: rows.length, sessions: sessions.size };
  }, [rows]);

  const topCards = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    for (const r of rows) {
      if (r.event_type !== "card_expand" && r.event_type !== "booking_link_click" && r.event_type !== "map_link_click") continue;
      const id = String((r.payload as { space_id?: string } | null)?.space_id ?? "");
      if (!id) continue;
      const name = String((r.payload as { name?: string } | null)?.name ?? id);
      counts[id] = { name, count: (counts[id]?.count ?? 0) + 1 };
    }
    return Object.entries(counts)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  const topFilters = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.event_type !== "filter_change") continue;
      const p = (r.payload ?? {}) as Record<string, unknown>;
      if (p.query) counts["sökord"] = (counts["sökord"] ?? 0) + 1;
      if (p.workMode) counts[`läge: ${String(p.workMode)}`] = (counts[`läge: ${String(p.workMode)}`] ?? 0) + 1;
      if (p.groupSize) counts[`storlek: ${String(p.groupSize)}`] = (counts[`storlek: ${String(p.groupSize)}`] ?? 0) + 1;
      if (p.freeOnly) counts["endast lediga grupprum"] = (counts["endast lediga grupprum"] ?? 0) + 1;
      const cats = (p.categories ?? {}) as Record<string, string[]>;
      for (const [cat, vals] of Object.entries(cats)) {
        for (const v of vals ?? []) {
          const k = `${cat}: ${v}`;
          counts[k] = (counts[k] ?? 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [rows]);

  const emptySearches = useMemo(() => {
    const out: { when: string; query?: string; workMode?: string; cats: string }[] = [];
    for (const r of rows) {
      if (r.event_type !== "empty_results") continue;
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const cats = Object.entries((p.categories ?? {}) as Record<string, string[]>)
        .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
        .join(" · ");
      out.push({
        when: new Date(r.created_at).toLocaleString("sv-SE"),
        query: p.query ? String(p.query) : undefined,
        workMode: p.workMode ? String(p.workMode) : undefined,
        cats,
      });
      if (out.length >= 30) break;
    }
    return out;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Statistik</h2>
        <div className="inline-flex rounded-full border border-border bg-card overflow-hidden text-sm">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Hämtar statistik…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen data ännu för vald period.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Sidvisningar" value={totals.byType.page_view ?? 0} />
            <Stat label="Unika sessioner" value={totals.sessions} />
            <Stat label="Kortklick (expand)" value={totals.byType.card_expand ?? 0} />
            <Stat label="Bokningsklick" value={totals.byType.booking_link_click ?? 0} />
            <Stat label="Kartklick" value={totals.byType.map_link_click ?? 0} />
            <Stat label="Filterändringar" value={totals.byType.filter_change ?? 0} />
            <Stat label="Sök utan träff" value={totals.byType.empty_results ?? 0} />
            <Stat label="Totalt händelser" value={totals.total} />
          </div>

          <Section title="Mest engagerande lokaler">
            {topCards.length === 0 ? (
              <Empty />
            ) : (
              <ol className="divide-y divide-border">
                {topCards.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{c.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Mest använda filter">
            {topFilters.length === 0 ? (
              <Empty />
            ) : (
              <ol className="divide-y divide-border">
                {topFilters.map(([label, count]) => (
                  <li key={label} className="flex items-center justify-between py-2 text-sm">
                    <span className="truncate">{label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Sökningar utan träff (senaste 30)">
            {emptySearches.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-border">
                {emptySearches.map((e, i) => (
                  <li key={i} className="py-2 text-sm">
                    <div className="text-xs text-muted-foreground">{e.when}</div>
                    <div className="truncate">
                      {e.query ? <span className="font-medium">"{e.query}"</span> : <span className="italic text-muted-foreground">ingen sökterm</span>}
                      {e.workMode && <span className="text-muted-foreground"> · läge: {e.workMode}</span>}
                      {e.cats && <span className="text-muted-foreground"> · {e.cats}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString("sv-SE")}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Ingen data ännu.</p>;
}
