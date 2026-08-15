import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../config/db";
import { bookings, Booking, NewBooking } from "./booking.schema";
import { courts } from "../courts/courts.schema";

export async function findBookingsForClub(clubId: string): Promise<Booking[]> {
  const rows = await db
    .select({ booking: bookings })
    .from(bookings)
    .innerJoin(courts, eq(bookings.courtId, courts.id))
    .where(eq(courts.clubId, clubId));
  return rows.map((r) => r.booking);
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
