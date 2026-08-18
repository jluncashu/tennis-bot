import { db } from "../../config/db";
import { contacts } from "./contacts.schema";
import { bookings } from "../booking/booking.schema";
import { courts } from "../courts/courts.schema";
import { eq, count, max, desc } from "drizzle-orm";
import type { Contact, NewContact } from "./contacts.schema";

export interface ContactWithStats extends Contact {
  bookingsCount: number;
  lastBookingDate: string | null;
}

// Contacts have no clubId of their own — club scoping only exists through
// their bookings (bookings -> courts -> clubId), so this also doubles as the
// "which customers has this club actually dealt with" filter.
export async function findContactsForClub(clubId: string): Promise<ContactWithStats[]> {
  const rows = await db
    .select({
      contact: contacts,
      bookingsCount: count(bookings.id),
      lastBookingDate: max(bookings.date),
    })
    .from(bookings)
    .innerJoin(courts, eq(bookings.courtId, courts.id))
    .innerJoin(contacts, eq(bookings.customerId, contacts.id))
    .where(eq(courts.clubId, clubId))
    .groupBy(contacts.id)
    .orderBy(desc(max(bookings.date)));
  return rows.map((r) => ({ ...r.contact, bookingsCount: Number(r.bookingsCount), lastBookingDate: r.lastBookingDate }));
}

export async function findContactByPhone(phone: string): Promise<Contact | null> {
  const [row] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
  return row ?? null;
}

export async function createContact(data: Pick<NewContact, "phone" | "name">): Promise<Contact> {
  const [row] = await db.insert(contacts).values(data).returning();
  return row;
}

export async function updateContactName(id: string, name: string): Promise<Contact | null> {
  const [row] = await db.update(contacts).set({ name }).where(eq(contacts.id, id)).returning();
  return row ?? null;
}
