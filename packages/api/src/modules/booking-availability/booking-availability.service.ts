import { getCourt, listCourts } from "../courts/courts.service";
import { findClubById } from "../auth/auth.repository";
import { findRulesByCourt } from "../availability-rules/availability-rules.repository";
import { findExceptionsForClub } from "../schedule-exceptions/schedule-exceptions.repository";
import { findConfirmedBookingsForCourtOnDate } from "../booking/booking.repository";
import { httpError } from "../../shared/http-error";

export interface Slot {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Day-of-week of a calendar date is a pure calendar fact, independent of
// any timezone — parsing at UTC noon avoids any DST/offset edge case.
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// "Today" is only meaningful relative to a timezone — a server running in
// UTC could disagree with the club's local date right around midnight.
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function generateCandidateSlots(rule: { startTime: string; endTime: string }, durationMinutes: number): Slot[] {
  const slots: Slot[] = [];
  const ruleStart = toMinutes(rule.startTime);
  const ruleEnd = toMinutes(rule.endTime);
  for (let start = ruleStart; start + durationMinutes <= ruleEnd; start += durationMinutes) {
    slots.push({ startTime: toTimeString(start), endTime: toTimeString(start + durationMinutes) });
  }
  return slots;
}

export async function getAvailableSlots(clubId: string, courtId: string, date: string): Promise<Slot[]> {
  const court = await getCourt(courtId, clubId); // throws 404 if not this club's court
  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const dow = dayOfWeek(date);
  const rules = (await findRulesByCourt(courtId)).filter((r) => r.dayOfWeek === dow);
  if (rules.length === 0) return []; // court isn't open this day of week at all

  const exceptions = (await findExceptionsForClub(clubId)).filter(
    (e) => e.date === date && (e.courtId === null || e.courtId === courtId)
  );
  if (exceptions.some((e) => e.startTime === null)) return []; // whole day blocked

  const blockedWindows = exceptions.map((e) => ({
    start: toMinutes(e.startTime as string),
    end: toMinutes(e.endTime as string),
  }));

  const durationMinutes = court.slotDurationMinutes ?? club.defaultSlotDurationMinutes;

  const candidates = rules
    .flatMap((rule) => generateCandidateSlots(rule, durationMinutes))
    .filter((slot) => {
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);
      return !blockedWindows.some((w) => overlaps(start, end, w.start, w.end));
    });

  // Overlap, not exact-start match: a multi-hour booking's second hour has
  // no candidate slot starting at its own startTime, so exact matching would
  // let someone double-book into the middle of an existing reservation.
  const existingBookings = await findConfirmedBookingsForCourtOnDate(courtId, date);
  const bookedWindows = existingBookings.map((b) => ({ start: toMinutes(b.startTime), end: toMinutes(b.endTime) }));

  return candidates.filter((slot) => {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    return !bookedWindows.some((w) => overlaps(start, end, w.start, w.end));
  });
}

// Walks the slot grid forward from startTime as long as each next cell is
// free, up to maxUnits cells. Used both to offer duration choices in the UI
// and to re-validate a chosen range at booking time.
export async function getConsecutiveDurations(
  clubId: string,
  courtId: string,
  date: string,
  startTime: string,
  maxUnits: number
): Promise<{ units: number; endTime: string }[]> {
  const slots = await getAvailableSlots(clubId, courtId, date);
  const slotByStart = new Map(slots.map((s) => [s.startTime, s]));

  const durations: { units: number; endTime: string }[] = [];
  let cursor = startTime;
  for (let i = 0; i < maxUnits; i++) {
    const slot = slotByStart.get(cursor);
    if (!slot) break;
    durations.push({ units: i + 1, endTime: slot.endTime });
    cursor = slot.endTime;
  }
  return durations;
}

const MAX_BOOKING_UNITS = 24; // generous cap on consecutive grid cells checked when validating a range

export async function isRangeAvailable(
  clubId: string,
  courtId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const durations = await getConsecutiveDurations(clubId, courtId, date, startTime, MAX_BOOKING_UNITS);
  return durations.some((d) => d.endTime === endTime);
}

export async function getAvailableDates(
  clubId: string,
  weekOffset: number
): Promise<{ date: string; hasAvailability: boolean }[]> {
  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const weekStart = addDays(todayInTimezone(club.timezone), weekOffset * 7);
  const clubCourts = await listCourts(clubId);

  const results: { date: string; hasAvailability: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    let hasAvailability = false;
    for (const court of clubCourts) {
      const slots = await getAvailableSlots(clubId, court.id, date);
      if (slots.length > 0) {
        hasAvailability = true;
        break;
      }
    }
    results.push({ date, hasAvailability });
  }
  return results;
}

export interface SearchParams {
  daysOfWeek: number[]; // empty = every day
  startTime: string; // HH:MM
  durationMinutes: number;
  courtType: "any" | "covered" | "uncovered";
  courtId?: string; // undefined = any court
}

export interface SearchSlot {
  date: string;
  weekday: number;
  courtId: string;
  courtName: string;
  covered: boolean;
  startTime: string;
  endTime: string;
}

export interface SearchLongTermOpportunity {
  courtId: string;
  courtName: string;
  covered: boolean;
  weekday: number;
  startTime: string;
  endTime: string;
  dates: string[];
}

export interface SearchResult {
  slots: SearchSlot[];
  longTerm: SearchLongTermOpportunity | null;
}

const SEARCH_WEEKS_AHEAD = 4;

// Real backend equivalent of the dashboard's old client-side mock search:
// scans upcoming dates for a (court, date) pair where [startTime,
// startTime+durationMinutes) is actually free (rules, exceptions, and
// existing bookings all honored via isRangeAvailable), then flags a
// "long-term" opportunity when one court is free at that same weekday/time
// across every occurrence considered in the window.
export async function searchAvailability(clubId: string, params: SearchParams): Promise<SearchResult> {
  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const allCourts = await listCourts(clubId);
  const candidateCourts = allCourts.filter(
    (c) =>
      (params.courtType === "any" || c.covered === (params.courtType === "covered")) &&
      (params.courtId === undefined || c.id === params.courtId)
  );
  if (candidateCourts.length === 0) return { slots: [], longTerm: null };

  const endTime = toTimeString(toMinutes(params.startTime) + params.durationMinutes);
  const startDate = todayInTimezone(club.timezone);

  const slots: SearchSlot[] = [];
  const consideredByGroup = new Map<string, string[]>();
  const freeByGroup = new Map<string, string[]>();

  for (let i = 0; i < SEARCH_WEEKS_AHEAD * 7; i++) {
    const date = addDays(startDate, i);
    const weekday = dayOfWeek(date);
    if (params.daysOfWeek.length > 0 && !params.daysOfWeek.includes(weekday)) continue;

    for (const court of candidateCourts) {
      const groupKey = `${court.id}__${weekday}`;
      consideredByGroup.set(groupKey, [...(consideredByGroup.get(groupKey) ?? []), date]);

      const available = await isRangeAvailable(clubId, court.id, date, params.startTime, endTime);
      if (!available) continue;

      slots.push({ date, weekday, courtId: court.id, courtName: court.name, covered: court.covered, startTime: params.startTime, endTime });
      freeByGroup.set(groupKey, [...(freeByGroup.get(groupKey) ?? []), date]);
    }
  }

  slots.sort((a, b) => a.date.localeCompare(b.date) || a.courtName.localeCompare(b.courtName));

  // Free on every considered occurrence of that weekday for that court, with
  // at least 3 occurrences in the window.
  let longTerm: SearchLongTermOpportunity | null = null;
  for (const [groupKey, freeDates] of freeByGroup) {
    const considered = consideredByGroup.get(groupKey) ?? [];
    if (considered.length < 3 || freeDates.length !== considered.length) continue;

    const [courtId, weekdayStr] = groupKey.split("__");
    const court = candidateCourts.find((c) => c.id === courtId)!;
    longTerm = {
      courtId: court.id,
      courtName: court.name,
      covered: court.covered,
      weekday: Number(weekdayStr),
      startTime: params.startTime,
      endTime,
      dates: freeDates,
    };
    break;
  }

  return { slots, longTerm };
}
