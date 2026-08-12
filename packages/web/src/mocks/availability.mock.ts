// Call-center availability search: scans upcoming dates for free (court, date,
// time) combinations matching an agent's filters, using the same mock
// reservation data the calendar renders (mockReservationsForDay), so a slot
// shown here is exactly what the calendar would show as free.

import { addDays, startOfDay, toDateId } from "../lib/date";
import { mockReservationsForDay, type Reservation } from "./reservations.mock";
import type { Court, CourtSettings } from "./settings.mock";

export type CourtTypeFilter = "any" | "covered" | "uncovered";

export interface AvailabilitySearchParams {
  daysOfWeek: number[]; // 0=Sun..6=Sat; empty = every day
  startHour: number;
  durationMinutes: number;
  courtType: CourtTypeFilter;
  courtName: string | null; // null = any registered court
}

export interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD
  weekday: number;
  startHour: number;
  durationMinutes: number;
  court: Court;
}

export interface LongTermOpportunity {
  court: Court;
  weekday: number;
  startHour: number;
  durationMinutes: number;
  dates: string[]; // one weekly occurrence per date, chronological
}

export interface AvailabilitySearchResult {
  slots: AvailabilitySlot[];
  longTerm: LongTermOpportunity | null;
}

const SEARCH_WEEKS_AHEAD = 4;

function matchesCourtType(court: Court, filter: CourtTypeFilter): boolean {
  if (filter === "covered") return court.covered;
  if (filter === "uncovered") return !court.covered;
  return true;
}

function reservationOverlaps(
  r: Reservation,
  slotStartHour: number,
  slotDurationMinutes: number,
  defaultDurationMinutes: number
): boolean {
  if (r.status === "cancelled") return false;
  const rStart = r.startHour;
  const rEnd = rStart + (r.durationMinutes ?? defaultDurationMinutes) / 60;
  const slotStart = slotStartHour;
  const slotEnd = slotStartHour + slotDurationMinutes / 60;
  return slotStart < rEnd && rStart < slotEnd;
}

// Scans the next few weeks for (date, court) pairs where the requested
// [startHour, startHour + durationMinutes) window is free and open, then
// flags a "long-term" opportunity when one court is free at that same
// weekday/time across every occurrence found in the window (~1 month ahead).
export function searchAvailability(
  params: AvailabilitySearchParams,
  settings: CourtSettings
): AvailabilitySearchResult {
  const { daysOfWeek, startHour, durationMinutes, courtType, courtName } = params;
  const slotEndHour = startHour + durationMinutes / 60;

  if (slotEndHour > settings.closeHour || startHour < settings.openHour) {
    return { slots: [], longTerm: null };
  }

  const candidateCourts = settings.courts.filter(
    (c) => matchesCourtType(c, courtType) && (courtName === null || c.name === courtName)
  );
  if (candidateCourts.length === 0) return { slots: [], longTerm: null };

  const today = startOfDay(new Date());
  const now = new Date();

  const slots: AvailabilitySlot[] = [];
  // Tracks, per (court, weekday), every candidate date considered (whether or
  // not it ended up free) so we know the true denominator for "free every week".
  const consideredByGroup = new Map<string, string[]>();
  const freeByGroup = new Map<string, string[]>();

  for (let i = 0; i < SEARCH_WEEKS_AHEAD * 7; i++) {
    const date = addDays(today, i);
    const weekday = date.getDay();
    if (daysOfWeek.length > 0 && !daysOfWeek.includes(weekday)) continue;

    // Can't book a slot that has already started today.
    if (date.getTime() === today.getTime() && startHour <= now.getHours()) continue;

    const dateId = toDateId(date);
    const dayReservations = mockReservationsForDay(date);

    for (const court of candidateCourts) {
      const groupKey = `${court.name}__${weekday}`;
      consideredByGroup.set(groupKey, [...(consideredByGroup.get(groupKey) ?? []), dateId]);

      const occupied = dayReservations.some(
        (r) =>
          r.court === court.name &&
          reservationOverlaps(r, startHour, durationMinutes, settings.slotDurationMinutes)
      );
      if (occupied) continue;

      slots.push({
        id: `${dateId}_${startHour}_${court.name.replace(/\s+/g, "")}`,
        date: dateId,
        weekday,
        startHour,
        durationMinutes,
        court,
      });
      freeByGroup.set(groupKey, [...(freeByGroup.get(groupKey) ?? []), dateId]);
    }
  }

  slots.sort((a, b) => a.date.localeCompare(b.date) || a.court.name.localeCompare(b.court.name));

  // A long-term opportunity: free on every considered occurrence of that
  // weekday for that court, with at least 3 occurrences in the window.
  let longTerm: LongTermOpportunity | null = null;
  for (const [groupKey, freeDates] of freeByGroup) {
    const considered = consideredByGroup.get(groupKey) ?? [];
    if (considered.length < 3 || freeDates.length !== considered.length) continue;

    const [courtName_, weekdayStr] = groupKey.split("__");
    const court = candidateCourts.find((c) => c.name === courtName_)!;
    longTerm = {
      court,
      weekday: Number(weekdayStr),
      startHour,
      durationMinutes,
      dates: freeDates,
    };
    break;
  }

  return { slots, longTerm };
}
