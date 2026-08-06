import { findContactByPhone, upsertContactSeen } from "./contacts.repository";

// WhatsApp itself buckets messages into 24h customer-service windows;
// reusing that boundary as "the customer re-entered the chat" avoids
// inventing a second, arbitrary definition of a session.
const CONVERSATION_GAP_MS = 24 * 60 * 60 * 1000;

export async function registerIncomingMessage(phone: string): Promise<{ isNewConversation: boolean }> {
  const now = new Date();
  const existing = await findContactByPhone(phone);
  const isNewConversation =
    !existing || now.getTime() - existing.lastSeenAt.getTime() > CONVERSATION_GAP_MS;

  await upsertContactSeen(phone, now);
  return { isNewConversation };
}
