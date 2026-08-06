import { db } from "../../config/db";
import { contacts } from "./contacts.schema";
import { eq } from "drizzle-orm";
import type { Contact } from "./contacts.schema";

export async function findContactByPhone(phone: string): Promise<Contact | null> {
  const [row] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
  return row ?? null;
}

export async function upsertContactSeen(phone: string, seenAt: Date): Promise<void> {
  await db
    .insert(contacts)
    .values({ phone, firstSeenAt: seenAt, lastSeenAt: seenAt })
    .onConflictDoUpdate({ target: contacts.phone, set: { lastSeenAt: seenAt } });
}
