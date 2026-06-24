import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { sv } from "date-fns/locale";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportAnalyticsToExcel } from "@/lib/analyticsExport";

type Row = {
  id: number;
  event_type: string;
  payload: Record<string, unknown> | null;
  session_id: string | null;
  path: string | null;
  created_at: string;
};

const PRESETS = [
  { key: "24h", label: "24 timmar", hours: 24 },
  { key: "7d", label: "7 dagar", hours: 24 * 7 },
  { key: "30d", label: "30 dagar", hours: 24 * 30 },
  { key: "custom", label: "Anpassad", hours: 0 },
] as const;
type PresetKey = (typeof PRESETS)[number]["key"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function AnalyticsTab() {
  const [preset, setPreset] = useState<PresetKey>("7d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return startOfDay(d);
  });
  const [customTo, setCustomTo] = useState<Date | undefined>(() => endOfDay(new Date()));

  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      const f = customFrom ? startOfDay(customFrom) : startOfDay(new Date());
      const t = customTo ? endOfDay(customTo) : endOfDay(new Date());
      return { from: f, to: t };
    }
    const p = PRESETS.find((x) => x.key === preset)!;
    return { from: new Date(Date.now() - p.hours * 3600 * 1000), to: new Date() };
  }, [preset, customFrom, customTo]);

  const periodValid = from <= to && (to.getTime() - from.getTime()) <= 365 * 24 * 3600 * 1000;

  const prevRange = useMemo(() => {
    const span = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - span);
    return { prevFrom, prevTo };
  }, [from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics_events", from.toISOString(), to.toISOString()],
    queryFn: async (): Promise<{ current: Row[]; previous: Row[] }> => {
      const [cur, prev] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("id,event_type,payload,session_id,path,created_at")
          .gte("created_at", from.toISOString())
          .lte("created_at", to.toISOString())
          .order("created_at", { ascending: false })
          .limit(50000),
        supabase
          .from("analytics_events")
          .select("id,event_type,payload,session_id,path,created_at")
          .gte("created_at", prevRange.prevFrom.toISOString())
          .lte("created_at", prevRange.prevTo.toISOString())
          .order("created_at", { ascending: false })
          .limit(50000),
      ]);
      if (cur.error) throw cur.error;
      if (prev.error) throw prev.error;
      return {
        current: (cur.data ?? []) as unknown as Row[],
        previous: (prev.data ?? []) as unknown as Row[],
      };
    },
    enabled: periodValid,
    refetchInterval: 30_000,
  });

  const rows = data?.current ?? [];
  const prevRows = data?.previous ?? [];


  const computeTotals = (src: Row[]) => {
    const byType: Record<string, number> = {};
    const sessions = new Set<string>();
    const sessionsExpanded = new Set<string>();
    const sessionsBooked = new Set<string>();
    for (const r of src) {
      byType[r.event_type] = (byType[r.event_type] ?? 0) + 1;
      if (r.session_id) sessions.add(r.session_id);
      if (r.event_type === "card_expand" && r.session_id) sessionsExpanded.add(r.session_id);
      if (r.event_type === "booking_link_click" && r.session_id) sessionsBooked.add(r.session_id);
    }
    return {
      byType,
      total: src.length,
      sessions: sessions.size,
      expandRate: sessions.size ? sessionsExpanded.size / sessions.size : 0,
      bookRate: sessions.size ? sessionsBooked.size / sessions.size : 0,
    };
  };
  const totals = useMemo(() => computeTotals(rows), [rows]);
  const prevTotals = useMemo(() => computeTotals(prevRows), [prevRows]);


  const timeSeries = useMemo(() => {
    const spanHours = (to.getTime() - from.getTime()) / 3600 / 1000;
    const byHour = spanHours <= 48;
    const buckets = new Map<string, { label: string; views: number; expands: number; bookings: number }>();
    for (const r of rows) {
      const d = new Date(r.created_at);
      const key = byHour
        ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
        : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = byHour
        ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`
        : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key) ?? { label, views: 0, expands: 0, bookings: 0 };
      if (r.event_type === "page_view") b.views++;
      else if (r.event_type === "card_expand") b.expands++;
      else if (r.event_type === "booking_link_click") b.bookings++;
      buckets.set(key, b);
    }
    return Array.from(buckets.values()).reverse();
  }, [rows, from, to]);

  const topCards = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    for (const r of rows) {
      if (!["card_expand", "booking_link_click", "map_link_click"].includes(r.event_type)) continue;
      const id = String((r.payload as { space_id?: string } | null)?.space_id ?? "");
      if (!id) continue;
      const name = String((r.payload as { name?: string } | null)?.name ?? id);
      counts[id] = { name, count: (counts[id]?.count ?? 0) + 1 };
    }
    return Object.entries(counts).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);
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
        for (const v of vals ?? []) counts[`${cat}: ${v}`] = (counts[`${cat}: ${v}`] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [rows]);

  const topQueries = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.event_type !== "filter_change") continue;
      const q = String((r.payload as { query?: string } | null)?.query ?? "").trim().toLowerCase();
      if (q) counts[q] = (counts[q] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const trafficByHour = useMemo(() => {
    const counts = new Array<number>(24).fill(0);
    for (const r of rows) {
      if (r.event_type !== "page_view") continue;
      counts[new Date(r.created_at).getHours()]++;
    }
    return counts.map((v, h) => ({ label: `${String(h).padStart(2, "0")}`, value: v }));
  }, [rows]);

  const trafficByWeekday = useMemo(() => {
    const names = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
    const counts = new Array<number>(7).fill(0);
    for (const r of rows) {
      if (r.event_type !== "page_view") continue;
      counts[new Date(r.created_at).getDay()]++;
    }
    // reorder Mon-Sun
    const ordered = [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: names[i], value: counts[i] }));
    return ordered;
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

  const emptyCombos = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.event_type !== "empty_results") continue;
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const parts: string[] = [];
      if (p.workMode) parts.push(`läge: ${String(p.workMode)}`);
      if (p.freeOnly) parts.push("endast lediga");
      const cats = (p.categories ?? {}) as Record<string, string[]>;
      for (const [k, v] of Object.entries(cats)) {
        for (const val of (v ?? []).slice().sort()) parts.push(`${k}: ${val}`);
      }
      const key = parts.length ? parts.sort().join(" · ") : "(inga filter)";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const deviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.event_type !== "page_view") continue;
      const d = String((r.payload as { device?: string } | null)?.device ?? "okänd");
      counts[d] = (counts[d] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const labels: Record<string, string> = { mobile: "Mobil", desktop: "Desktop", tablet: "Surfplatta", okänd: "Okänd" };
    return Object.entries(counts)
      .map(([k, v]) => ({ key: k, label: labels[k] ?? k, count: v, pct: total ? v / total : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.event_type !== "page_view") continue;
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const utm = p.utm_source ? `utm: ${String(p.utm_source)}` : null;
      const ref = p.referrer ? String(p.referrer) : null;
      const key = utm ?? ref ?? "direkt";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const heatmap = useMemo(() => {
    // 7 rows (Mon-Sun) x 24 cols
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const r of rows) {
      if (r.event_type !== "page_view") continue;
      const d = new Date(r.created_at);
      const dow = (d.getDay() + 6) % 7; // Mon=0
      grid[dow][d.getHours()]++;
    }
    let max = 0;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    return { grid, max };
  }, [rows]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Statistik</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full border border-border bg-card overflow-hidden text-sm">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`px-3 py-1.5 ${preset === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => exportAnalyticsToExcel(rows, from, to)}
          >
            <Download className="h-4 w-4 mr-2" /> Exportera Excel
          </Button>
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex items-end gap-3 flex-wrap rounded-xl border border-border bg-card p-4">
          <DatePicker label="Från" value={customFrom} onChange={setCustomFrom} />
          <DatePicker label="Till" value={customTo} onChange={setCustomTo} />
          {!periodValid && (
            <p className="text-sm text-destructive">
              Ogiltig period (max 365 dagar, från ≤ till).
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Vald period: {format(from, "d MMM yyyy HH:mm", { locale: sv })} – {format(to, "d MMM yyyy HH:mm", { locale: sv })}
      </p>

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
            <Stat label="Länkklick lokalsida" value={totals.byType.space_link_click ?? 0} />
            <Stat label="Filterändringar" value={totals.byType.filter_change ?? 0} />
            <Stat label="Sök utan träff" value={totals.byType.empty_results ?? 0} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Stat label="Sessioner som expanderade kort" value={`${(totals.expandRate * 100).toFixed(1)}%`} />
            <Stat label="Sessioner med bokningsklick" value={`${(totals.bookRate * 100).toFixed(1)}%`} />
          </div>

          <Section title="Aktivitet över tid">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="views" name="Sidvisningar" fill="hsl(var(--primary))" />
                  <Bar dataKey="expands" name="Kortklick" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="bookings" name="Bokningsklick" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Trafik per timme på dygnet">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trafficByHour}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="Trafik per veckodag">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trafficByWeekday}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          <Section title="Mest engagerande lokaler">
            {topCards.length === 0 ? <Empty /> : (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Mest använda filter">
              {topFilters.length === 0 ? <Empty /> : (
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
            <Section title="Vanligaste sökord">
              {topQueries.length === 0 ? <Empty /> : (
                <ol className="divide-y divide-border">
                  {topQueries.map(([q, count]) => (
                    <li key={q} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate">"{q}"</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>

          <Section title="Sökningar utan träff (senaste 30)">
            {emptySearches.length === 0 ? <Empty /> : (
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

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-[200px] justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "d MMM yyyy", { locale: sv }) : <span>Välj datum</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            locale={sv}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("sv-SE") : value}
      </div>
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
