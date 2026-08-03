import { createServerFn } from "@tanstack/react-start";
import { fetchOpeningHoursSchedule } from "./openingHoursSchedule.server";
import type { OpeningHoursSchedule } from "./openingHoursSchedule.server";

export type { OpeningHoursSchedule, ScheduleDay, ScheduleWeek } from "./openingHoursSchedule.server";

export const getOpeningHoursSchedule = createServerFn({ method: "GET" }).handler(
  async (): Promise<OpeningHoursSchedule> => fetchOpeningHoursSchedule(26),
);
