import { eq, and, asc, desc, gte, lte, inArray } from "drizzle-orm";
import { db } from "../../config/db";
import { bookings, Booking, NewBooking } from "./booking.schema";
import { courts } from "../courts/courts.schema";
import { contacts } from "../contacts/contacts.schema";

export interface BookingWithDetails extends Booking {
  courtName: string;
  customerName: string | null;
  customerPhone: string;
}

export async function findBookingsForClub(clubId: string, from?: string, to?: string): Promise<BookingWithDetails[]> {
  const conditions = [eq(courts.clubId, clubId)];
  if (from) conditions.push(gte(bookings.date, from));
  if (to) conditions.push(lte(bookings.date, to));

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
    .where(and(...conditions));
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

export async function findUpcomingConfirmedBookingsForContact(
  clubId: string,
  customerId: string,
  fromDate: string
): Promise<BookingWithDetails[]> {
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
    .where(
      and(
        eq(courts.clubId, clubId),
        eq(bookings.customerId, customerId),
        eq(bookings.status, "confirmed"),
        gte(bookings.date, fromDate)
      )
    )
    .orderBy(asc(bookings.date), asc(bookings.startTime));
  return rows.map((r) => ({ ...r.booking, courtName: r.courtName, customerName: r.customerName, customerPhone: r.customerPhone }));
}

// Confirmed only — the grid export has no room for a third visual state, so
// a cancelled slot should just read as free rather than as "cancelled".
export async function findConfirmedBookingsForClubOnDate(clubId: string, date: string): Promise<BookingWithDetails[]> {
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
    .where(and(eq(courts.clubId, clubId), eq(bookings.date, date), eq(bookings.status, "confirmed")))
    .orderBy(asc(courts.name), asc(bookings.startTime));
  return rows.map((r) => ({ ...r.booking, courtName: r.courtName, customerName: r.customerName, customerPhone: r.customerPhone }));
}

// Full history for a customer (any status, most recent first) — used by the
// customer detail view, unlike findUpcomingConfirmedBookingsForContact above
// which only looks forward and only at confirmed bookings.
export async function findBookingsForContactInClub(clubId: string, customerId: string): Promise<BookingWithDetails[]> {
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
    .where(and(eq(courts.clubId, clubId), eq(bookings.customerId, customerId)))
    .orderBy(desc(bookings.date), desc(bookings.startTime));
  return rows.map((r) => ({ ...r.booking, courtName: r.courtName, customerName: r.customerName, customerPhone: r.customerPhone }));
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
    .delete(bookings)
    .where(and(eq(bookings.id, id), inArray(bookings.courtId, clubCourtIds)))
    .returning();
  return row ?? null;
}
