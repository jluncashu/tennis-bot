import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../config/db";
import { bookings, Booking, NewBooking } from "./booking.schema";
import { courts } from "../courts/courts.schema";
import { contacts } from "../contacts/contacts.schema";

export interface BookingWithDetails extends Booking {
  courtName: string;
  customerName: string | null;
  customerPhone: string;
}

export async function findBookingsForClub(clubId: string): Promise<BookingWithDetails[]> {
  const rows = await db
    .select({
      booking: bookings,
      courtName: courts.name,
      customerName: contacts.name,
      customerPhone: contacts.phone,
    })
    .from(bookings)
    .innerJoin(courts, eq(bookings.courtId, courts.id))
    .innerJoin(contacts, eq(bookings.customerId, contacts.id))
    .where(eq(courts.clubId, clubId));
  return rows.map((r) => ({ ...r.booking, courtName: r.courtName, customerName: r.customerName, customerPhone: r.customerPhone }));
}

export async function findBookingById(id: string, clubId: string): Promise<Booking | null> {
  const [row] = await db
    .select({ booking: bookings })
    .from(bookings)
    .innerJoin(courts, eq(bookings.courtId, courts.id))
    .where(and(eq(bookings.id, id), eq(courts.clubId, clubId)))
    .limit(1);
  return row?.booking ?? null;
}

export async function findConfirmedBookingsForCourtOnDate(courtId: string, date: string): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.courtId, courtId), eq(bookings.date, date), eq(bookings.status, "confirmed")));
}

export async function createBooking(data: NewBooking): Promise<Booking> {
  const [row] = await db.insert(bookings).values(data).returning();
  return row;
}

export async function cancelBooking(id: string, clubId: string): Promise<Booking | null> {
  const clubCourtIds = db.select({ id: courts.id }).from(courts).where(eq(courts.clubId, clubId));
  const [row] = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, id), inArray(bookings.courtId, clubCourtIds)))
    .returning();
  return row ?? null;
}
