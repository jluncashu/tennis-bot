import { findContactByPhone, createContact, updateContactName } from "./contacts.repository";
import type { Contact } from "./contacts.schema";

export async function findOrCreateContact(phone: string, name?: string): Promise<Contact> {
  const existing = await findContactByPhone(phone);

  if (!existing) {
    return createContact({ phone, name: name ?? null });
  }

  if (name && !existing.name) {
    return (await updateContactName(existing.id, name)) ?? existing;
  }

  return existing;
}
