import { getCourt } from "../courts/courts.service";
import { isRangeAvailable, todayInTimezone } from "../booking-availability/booking-availability.service";
import { findOrCreateContact } from "../contacts/contacts.service";
import { findClubById } from "../auth/auth.repository";
import {
  findBookingsForClub,
  findBookingById,
  findUpcomingConfirmedBookingsForContact,
  createBooking,
  cancelBooking,
} from "./booking.repository";
import { httpError } from "../../shared/http-error";
import { emitBookingsChanged } from "../../services/booking-events.service";

const UNIQUE_VIOLATION = "23505"; // Postgres error code

export async function listBookingsForClub(clubId: string) {
  return findBookingsForClub(clubId);
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

  const contact = await findOrCreateContact(phone, name);

  try {
    const booking = await createBooking({
      courtId,
      customerId: contact.id,
      date,
      startTime,
      endTime,
      status: "confirmed",
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

  const contact = await findOrCreateContact(phone, name);

  try {
    const booking = await createBooking({
      courtId,
      customerId: contact.id,
      date,
      startTime,
      endTime,
      status: "confirmed",
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
