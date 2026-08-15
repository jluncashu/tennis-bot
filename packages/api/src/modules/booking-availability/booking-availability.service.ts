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
function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// "Today" is only meaningful relative to a timezone — a server running in
// UTC could disagree with the club's local date right around midnight.
function todayInTimezone(timezone: string): string {
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

  const existingBookings = await findConfirmedBookingsForCourtOnDate(courtId, date);
  const bookedStarts = new Set(existingBookings.map((b) => toMinutes(b.startTime)));

  return candidates.filter((slot) => !bookedStarts.has(toMinutes(slot.startTime)));
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
