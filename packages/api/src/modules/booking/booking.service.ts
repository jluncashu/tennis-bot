import { getCourt, listCourts } from "../courts/courts.service";
import { isRangeAvailable, todayInTimezone, dayOfWeek } from "../booking-availability/booking-availability.service";
import { findOrCreateContact } from "../contacts/contacts.service";
import { findClubById } from "../auth/auth.repository";
import { getEffectivePrice } from "../price-rules/price-rules.service";
import {
  findBookingsForClub,
  findBookingById,
  findUpcomingConfirmedBookingsForContact,
  findBookingsForContactInClub,
  findConfirmedBookingsForClubOnDate,
  createBooking,
  cancelBooking,
} from "./booking.repository";
import { buildDailyGridWorkbook, type GridBooking, type GridWindow } from "./booking-export";
import { httpError } from "../../shared/http-error";
import { emitBookingsChanged } from "./booking-events";

const UNIQUE_VIOLATION = "23505"; // Postgres error code

export async function listBookingsForClub(clubId: string, from?: string, to?: string) {
  return findBookingsForClub(clubId, from, to);
}

export async function listBookingsForContactInClub(clubId: string, customerId: string) {
  return findBookingsForContactInClub(clubId, customerId);
}

export async function exportDailyGrid(clubId: string, date: string) {
  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const clubCourts = await listCourts(clubId); // stable, dashboard-matching order; rules already embedded per court
  const dow = dayOfWeek(date);

  const openRulesByCourtId = new Map<string, GridWindow[]>(
    clubCourts.map((c) => [
      c.id,
      c.rules.filter((r) => r.dayOfWeek === dow).map((r) => ({ startTime: r.startTime, endTime: r.endTime })),
    ])
  );

  const slotDurationMinutesByCourtId = new Map(
    clubCourts.map((c) => [c.id, c.slotDurationMinutes ?? club.defaultSlotDurationMinutes])
  );

  const bookingsByCourtId = new Map<string, GridBooking[]>(clubCourts.map((c) => [c.id, []]));
  for (const b of await findConfirmedBookingsForClubOnDate(clubId, date)) {
    bookingsByCourtId.get(b.courtId)?.push({ startTime: b.startTime, endTime: b.endTime, customerName: b.customerName });
  }

  return buildDailyGridWorkbook({
    clubName: club.name,
    date,
    courts: clubCourts.map((c) => ({ id: c.id, name: c.name })),
    openRulesByCourtId,
    bookingsByCourtId,
    slotDurationMinutesByCourtId,
  });
}

export async function createBookingForCustomer(
  clubId: string,
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  phone: string,
  name?: string
) {
  await getCourt(courtId, clubId); // throws 404 if not this club's court

  // Re-validates the whole range (not just startTime), so a multi-hour
  // booking can't slip through if part of it filled up in the meantime.
  const available = await isRangeAvailable(clubId, courtId, date, startTime, endTime);
  if (!available) throw httpError(409, "Slot no longer available");

  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const contact = await findOrCreateContact(phone, name);
  const priceRon = await getEffectivePrice(courtId, date, startTime, club.defaultPriceRon);

  try {
    const booking = await createBooking({
      courtId,
      customerId: contact.id,
      date,
      startTime,
      endTime,
      status: "confirmed",
      priceRon,
    });
    emitBookingsChanged(clubId);
    return booking;
  } catch (err: any) {
    if (err?.code === UNIQUE_VIOLATION) {
      // Race: someone else booked the same slot between our check and the insert.
      throw httpError(409, "Slot no longer available");
    }
    throw err;
  }
}

// Admin-created bookings (quick-add on the dashboard) pick any start/end time
// directly, unlike the customer-facing flow above which must match a slot
// generated from availability rules — staff can book outside those rules.
export async function createManualBooking(
  clubId: string,
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  phone: string,
  name?: string
) {
  await getCourt(courtId, clubId); // throws 404 if not this club's court

  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const contact = await findOrCreateContact(phone, name);
  const priceRon = await getEffectivePrice(courtId, date, startTime, club.defaultPriceRon);

  try {
    const booking = await createBooking({
      courtId,
      customerId: contact.id,
      date,
      startTime,
      endTime,
      status: "confirmed",
      priceRon,
    });
    emitBookingsChanged(clubId);
    return booking;
  } catch (err: any) {
    if (err?.code === UNIQUE_VIOLATION) {
      throw httpError(409, "Slot no longer available");
    }
    throw err;
  }
}

export async function cancelBookingForClub(id: string, clubId: string) {
  const cancelled = await cancelBooking(id, clubId);
  if (!cancelled) throw httpError(404, "Booking not found");
  emitBookingsChanged(clubId);
  return cancelled;
}

export async function listUpcomingBookingsForCustomer(clubId: string, phone: string) {
  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  const contact = await findOrCreateContact(phone);
  const fromDate = todayInTimezone(club.timezone);
  return findUpcomingConfirmedBookingsForContact(clubId, contact.id, fromDate);
}
