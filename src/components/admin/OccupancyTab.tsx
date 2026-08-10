import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type Space } from "@/lib/spaces";
import { useRealtimeOccupancy } from "@/lib/useOccupancy";
import { DEFAULT_SCHEDULE, type OccupancySchedule, useOccupancySettings, useSaveOccupancySettings } from "@/lib/useOccupancySettings";
import { isOpenNow, useOpeningHours } from "@/lib/useOpeningHours";
import { cn } from "@/lib/utils";

export function OccupancySettingsTab() {
  const { data } = useOccupancySettings();
  const save = useSaveOccupancySettings();
  const [enabled, setEnabled] = useState<boolean>(true);
  const [schedule, setSchedule] = useState<OccupancySchedule>(DEFAULT_SCHEDULE);

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setSchedule(data.schedule);
    }
  }, [data]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-1">Beläggningsindikator</h2>
        <p className="text-sm text-muted-foreground">
          Styr om realtidsbeläggningen ska visas i studentvyn. Öppettiderna hämtas automatiskt från bibliotekets
          öppettids-API. Per-lokal kan beläggningen även slås av på respektive lokalkort.
        </p>
      </div>

      <OccupancyDiagnosticsPanel globalEnabled={enabled} />

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border cursor-pointer accent-[var(--kth-blue)]"
          />
          <span>
            <span className="block text-sm font-medium">Visa beläggning för samtliga lokaler</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Slå av detta för att dölja beläggningsindikatorn på alla lokalkort samtidigt (t.ex. vid tekniska problem
              med Countmatters).
            </span>
          </span>
        </label>
      </div>



      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            save.mutate(
              { enabled, schedule },
              {
                onSuccess: () => toast.success("Sparat"),
                onError: (e: any) => toast.error(e.message),
              },
            )
          }
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Sparar..." : "Spara"}
        </button>
      </div>
    </div>
  );
}

// ---------------- Opening hours (external API) ----------------


export function OccupancyDiagnosticsPanel({ globalEnabled }: { globalEnabled: boolean }) {
  const { data: realtime, isFetching, refetch, dataUpdatedAt } = useRealtimeOccupancy();
  const { data: openingHours } = useOpeningHours();

  const { data: spacesData } = useQuery({
    queryKey: ["spaces", "occupancy-sensors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name, countmatters_sensor_id, show_occupancy")
        .not("countmatters_sensor_id", "is", null);
      if (error) throw error;
      return (data ?? []) as Array<Pick<Space, "id" | "name" | "countmatters_sensor_id" | "show_occupancy">>;
    },
  });

  const now = new Date();
  const withinSchedule = isOpenNow(openingHours, now);

  const httpOk = realtime && realtime.httpStatus >= 200 && realtime.httpStatus < 300;
  const locationOpen = realtime?.location && realtime.location.toLowerCase() !== "closed";
  const zoneNames = realtime ? Object.keys(realtime.zones) : [];

  const overallOk = globalEnabled && withinSchedule && httpOk && !realtime?.error && zoneNames.length > 0;

  const statusColor = overallOk ? "bg-emerald-500" : httpOk ? "bg-amber-500" : "bg-rose-500";

  const statusLabel = overallOk
    ? "Beläggning visas just nu"
    : !globalEnabled
      ? "Avstängd globalt i admin"
      : !withinSchedule
        ? "Utanför visningstider"
        : !httpOk
          ? "API-fel"
          : realtime?.location === "closed"
            ? "Datakällan rapporterar stängt"
            : zoneNames.length === 0
              ? "Inga zoner i API-svaret"
              : "Kontrollera konfiguration";

  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "–";
    try {
      return new Date(iso).toLocaleString("sv-SE");
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full", statusColor)} />
            Status för datakoppling
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{statusLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {isFetching ? "Hämtar..." : "Testa nu"}
        </button>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <dt className="text-muted-foreground">Global visning</dt>
          <dd className="font-medium">{globalEnabled ? "På" : "Av"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Inom visningstid nu</dt>
          <dd className="font-medium">{withinSchedule ? "Ja" : "Nej"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">HTTP-status</dt>
          <dd className="font-medium">
            {realtime ? realtime.httpStatus || "nätverksfel" : "–"}
            {realtime?.error ? ` · ${realtime.error}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Källans läge</dt>
          <dd className="font-medium">{realtime?.location ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Senast uppdaterad (källa)</dt>
          <dd className="font-medium">{fmt(realtime?.lastUpdated)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Senast hämtad</dt>
          <dd className="font-medium">{fmt(dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Öppettider (källa)</dt>
          <dd className="font-medium">
            {realtime?.hours ? `${fmt(realtime.hours.from)} – ${fmt(realtime.hours.to)}` : "–"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Zoner i svaret</dt>
          <dd className="font-medium">{zoneNames.length}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">API-endpoint</dt>
          <dd className="font-mono text-[11px] break-all">{realtime?.apiUrl ?? "–"}</dd>
        </div>
      </dl>

      {spacesData && spacesData.length > 0 && (
        <div className="pt-2 border-t border-border">
          <h4 className="text-xs font-semibold mb-1.5">Konfigurerade sensorer</h4>
          <ul className="space-y-1 text-xs">
            {spacesData.map((s) => {
              const id = s.countmatters_sensor_id ?? "";
              const zone = realtime?.zones?.[id];
              const matched = Boolean(zone && zone.threshold > 0);
              return (
                <li key={s.id} className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full flex-shrink-0",
                      matched ? "bg-emerald-500" : httpOk ? "bg-amber-500" : "bg-rose-500",
                    )}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-[11px]">{id}</span>
                  {matched && (
                    <span className="text-muted-foreground">
                      · {zone!.inside}/{zone!.threshold}
                    </span>
                  )}
                  {!matched && httpOk && <span className="text-muted-foreground">· ingen matchande zon i svaret</span>}
                  {s.show_occupancy === false && <span className="text-amber-600">· visning av på kortet</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground pt-1">
        Denna diagnostik anropar datakällan direkt (ingen AI inblandad) och fungerar oförändrat om appen flyttas till en
        annan sajt.
      </p>
    </div>
  );
}
