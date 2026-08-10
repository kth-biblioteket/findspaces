import { useState } from "react";
import { isOpenNow, useOpeningHours } from "@/lib/useOpeningHours";
import { useOpeningHoursSchedule } from "@/lib/useOpeningHoursSchedule";

export function OpeningHoursTab() {
  const { data, isFetching, isError, refetch, dataUpdatedAt } = useOpeningHours();
  const schedule = useOpeningHoursSchedule();
  const openNow = isOpenNow(data, new Date());
  const todayISO = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const status: { label: string; tone: string; detail: string } = (() => {
    if (isFetching && !data) return { label: "Hämtar…", tone: "bg-muted text-muted-foreground", detail: "Kontaktar API:et." };
    if (isError || !data)
      return {
        label: "Ingen kontakt",
        tone: "bg-rose-100 text-rose-700",
        detail: "API:et kunde inte nås. Appen visar beläggning och filter som vanligt (fail-open).",
      };
    if (data.error)
      return {
        label: "Fel svar",
        tone: "bg-amber-100 text-amber-800",
        detail: `${data.error} – appen visar beläggning och filter som vanligt (fail-open).`,
      };
    return {
      label: "Fungerar",
      tone: "bg-emerald-100 text-emerald-700",
      detail: `Svar HTTP ${data.httpStatus} från API:et.`,
    };
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Öppettider</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Öppettiderna hämtas automatiskt från bibliotekets öppettids-API och styr när realtidsfunktionerna visas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            refetch();
            schedule.refetch();
          }}
          disabled={isFetching || schedule.isFetching}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {isFetching || schedule.isFetching ? "Hämtar..." : "Uppdatera"}
        </button>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">
          Det här styrs av öppettiderna (utanför dem döljs eller inaktiveras det):
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <span className="text-foreground">Beläggningsindikatorn på lokalkorten</span> – färgprick och text (Ledigt /
            Medel / Upptaget) samt statusen ”Ledigt just nu” för grupprum.
          </li>
          <li>
            <span className="text-foreground">Filtret ”Visa bara lediga just nu”</span> i filtermenyn (grupprum).
          </li>
          <li>
            <span className="text-foreground">Sorteringsvalet ”Lediga just nu först”</span>.
          </li>
          <li>
            <span className="text-foreground">Fritextsökningen</span> – ord som ”ledigt” matchar bara när realtidsstatus
            är aktiv.
          </li>
          <li>
            <span className="text-foreground">Meddelandet vid noll träffar</span> – förslaget om att ta bort ”lediga
            just nu”.
          </li>
        </ul>
        <p>
          Om öppettids-API:t inte svarar visas beläggning och filter ändå, så att studentvyn aldrig blir tom på grund av
          ett tekniskt fel.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Koppling till API:et</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{status.detail}</p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">API-adress</dt>
          <dd className="break-all font-mono">{data?.apiUrl ?? "–"}</dd>
          <dt className="text-muted-foreground">HTTP-status</dt>
          <dd>{data ? (data.httpStatus || "ingen anslutning") : "–"}</dd>
          <dt className="text-muted-foreground">Senast hämtat</dt>
          <dd>{dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString("sv-SE") : "–"}</dd>
          <dt className="text-muted-foreground">Öppet idag</dt>
          <dd>{data ? (data.openToday ? "Ja" : "Nej") : "–"}</dd>
          <dt className="text-muted-foreground">Tider idag</dt>
          <dd>{data?.hoursToday ?? "–"}</dd>
          <dt className="text-muted-foreground">Status just nu</dt>
          <dd>{openNow ? "Realtidsfunktioner visas" : "Utanför öppettiderna"}</dd>
        </dl>
      </div>

      <OpeningHoursWeeks
        weeks={schedule.data?.weeks ?? []}
        isPending={schedule.isPending}
        todayISO={todayISO}
      />

    </div>
  );
}

export function OpeningHoursWeeks({
  weeks,
  isPending,
  todayISO,
}: {
  weeks: Array<{ label: string; days: Array<{ date: string; name: string; hours: string }> }>;
  isPending: boolean;
  todayISO: string;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(weeks.length - 1, 0));
  const week = weeks[safeIndex];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Öppettider – 6 månader framåt</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Hämtas vecka för vecka från API:et (svenska). Bläddra för att se kommande veckor.
        </p>
      </div>

      {isPending ? (
        <p className="text-xs text-muted-foreground">Hämtar öppettider…</p>
      ) : week ? (
        <div className="space-y-3">
          <h4 className="text-base font-bold">{week.label}</h4>
          <ul className="max-w-sm text-sm">
            {week.days.map((day) => {
              const isToday = day.date === todayISO;
              const closed = /stängt/i.test(day.hours ?? "");
              return (
                <li
                  key={day.date}
                  className={`flex items-baseline justify-between gap-3 py-0.5 ${isToday ? "font-semibold" : ""}`}
                >
                  <span className="flex items-baseline gap-2">
                    <span>{day.name}</span>
                    {isToday && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">Idag</span>
                    )}
                  </span>
                  <span className={closed ? "text-muted-foreground" : ""}>{day.hours || "–"}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIndex(Math.max(safeIndex - 1, 0))}
              disabled={safeIndex === 0}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
            >
              Föreg.
            </button>
            <button
              type="button"
              onClick={() => setIndex(Math.min(safeIndex + 1, weeks.length - 1))}
              disabled={safeIndex >= weeks.length - 1}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
            >
              Nästa
            </button>
            <span className="text-xs text-muted-foreground">
              Vecka {safeIndex + 1} av {weeks.length}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Inga öppettider kunde hämtas från API:et just nu.</p>
      )}
    </div>
  );
}



// ---------------- Occupancy Diagnostics ----------------

