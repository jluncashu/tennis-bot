import { findContactByPhone, createContact, updateContactName, findContactsForClub } from "./contacts.repository";
import type { Contact } from "./contacts.schema";

// Callers disagree on format: WhatsApp sends bare digits ("40730452121"),
// manual dashboard entry may include a leading "+". Normalize to E.164
// ("+40730452121") so both resolve to the same stored contact.
export function normalizePhone(phone: string): string {
  return "+" + phone.replace(/\D/g, "");
}

export async function findOrCreateContact(phone: string, name?: string): Promise<Contact> {
  const normalizedPhone = normalizePhone(phone);
  const existing = await findContactByPhone(normalizedPhone);
  if (!existing) {
    return createContact({ phone: normalizedPhone, name: name ?? null });
  }
  if (name && !existing.name) {
    return (await updateContactName(existing.id, name)) ?? existing;
  }
  return existing;
}

export async function listContactsForClub(clubId: string) {
  return findContactsForClub(clubId);
}
