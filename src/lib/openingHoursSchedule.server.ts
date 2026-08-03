const BASE_URL = process.env.OPENINGHOURS_API_BASE ??
  "https://api.lib.kth.se/bookingsystem/v1/openinghoursjson/openinghours";

export type ScheduleDay = { date: string; name: string; hours: string };
export type ScheduleWeek = { label: string; days: ScheduleDay[] };

export type OpeningHoursSchedule = {
  weeks: ScheduleWeek[];
  apiUrlTemplate: string;
  fetchedAt: string;
  httpStatus: number;
  error?: string;
};

/** Today's date in Swedish local time, YYYY-MM-DD. */
function swedishTodayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function mondayOf(iso: string): Date {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetches ~6 months (26 weeks) of Swedish opening hours, week by week. */
export async function fetchOpeningHoursSchedule(
  weekCount = 26,
): Promise<OpeningHoursSchedule> {
  const fetchedAt = new Date().toISOString();
  const apiUrlTemplate = `${BASE_URL}/{YYYY-MM-DD}/1/2/sv`;
  const start = mondayOf(swedishTodayISO());

  const dates: string[] = [];
  for (let i = 0; i < weekCount; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    dates.push(toISO(d));
  }

  let httpStatus = 0;
  let error: string | undefined;

  const results = await Promise.all(
    dates.map(async (date) => {
      try {
        const res = await fetch(`${BASE_URL}/${date}/1/2/sv`, {
          headers: { Accept: "application/json" },
        });
        httpStatus = res.status;
        if (!res.ok) {
          error = `HTTP ${res.status}`;
          return null;
        }
        const json = (await res.json()) as {
          week?: string;
          days?: ScheduleDay[];
        };
        const days = Array.isArray(json.days) ? json.days : [];
        if (days.length === 0) return null;
        return { label: json.week ?? date, days } satisfies ScheduleWeek;
      } catch (e) {
        error = e instanceof Error ? e.message : "fetch failed";
        return null;
      }
    }),
  );

  const seen = new Set<string>();
  const weeks: ScheduleWeek[] = [];
  for (const w of results) {
    if (!w) continue;
    const key = w.days[0]?.date ?? w.label;
    if (seen.has(key)) continue;
    seen.add(key);
    weeks.push(w);
  }

  return { weeks, apiUrlTemplate, fetchedAt, httpStatus, error };
}
