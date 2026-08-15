import { getCourt } from "../courts/courts.service";
import { getAvailableSlots } from "../booking-availability/booking-availability.service";
import { findOrCreateContact } from "../contacts/contacts.service";
import { findBookingsForClub, findBookingById, createBooking, cancelBooking } from "./booking.repository";
import { httpError } from "../../shared/http-error";

const UNIQUE_VIOLATION = "23505"; // Postgres error code

export async function listBookingsForClub(clubId: string) {
  return findBookingsForClub(clubId);
}

export async function createBookingForCustomer(
  clubId: string,
  courtId: string,
  date: string,
  startTime: string,
  phone: string,
  name?: string
) {
  await getCourt(courtId, clubId); // throws 404 if not this club's court

  const availableSlots = await getAvailableSlots(clubId, courtId, date);
  const slot = availableSlots.find((s) => s.startTime === startTime);
  if (!slot) throw httpError(409, "Slot no longer available");

  const contact = await findOrCreateContact(phone, name);

  try {
    return await createBooking({
      courtId,
      customerId: contact.id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "confirmed",
    });
  } catch (err: any) {
    if (err?.code === UNIQUE_VIOLATION) {
      // Race: someone else booked the same slot between our check and the insert.
      throw httpError(409, "Slot no longer available");
    }
    throw err;
  }
}

export async function cancelBookingForClub(id: string, clubId: string) {
  const cancelled = await cancelBooking(id, clubId);
  if (!cancelled) throw httpError(404, "Booking not found");
  return cancelled;
}
