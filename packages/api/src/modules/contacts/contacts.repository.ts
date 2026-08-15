import { db } from "../../config/db";
import { contacts } from "./contacts.schema";
import { eq } from "drizzle-orm";
import type { Contact, NewContact } from "./contacts.schema";

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
