import { Request, Response } from "express";
import { env } from "../config/env";
import { findClubByWhatsappPhoneNumberId } from "../modules/auth/auth.repository";
import { handleIncomingMessage } from "../modules/conversation/conversation.service";

export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
}

export async function receiveMessage(req: Request, res: Response) {
  res.sendStatus(200); // ack immediately, Meta retries on timeout/non-2xx

  const value = req.body?.entry?.[0]?.changes?.[0]?.value;
  const phoneNumberId = value?.metadata?.phone_number_id;
  const msg = value?.messages?.[0];
  if (!msg || !phoneNumberId) return; // status update or unrelated payload, not an actual message

  const club = await findClubByWhatsappPhoneNumberId(phoneNumberId);
  if (!club) {
    console.warn(`No club registered for WhatsApp phone_number_id ${phoneNumberId}`);
    return;
  }

  const normalized = normalizeMessage(msg);
  if (!normalized) return;

  console.log(`[whatsapp] ${club.name} <- ${normalized.from}:`, normalized.buttonId ? `button="${normalized.buttonId}"` : `text="${normalized.text}"`);

  await handleIncomingMessage(club.id, normalized.from, normalized);
}

function normalizeMessage(msg: any): { from: string; text?: string; buttonId?: string } | null {
  const from = msg.from;
  if (!from) return null;

  if (msg.type === "interactive") {
    const buttonId = msg.interactive?.list_reply?.id ?? msg.interactive?.button_reply?.id;
    return buttonId ? { from, buttonId } : null;
  }

  if (msg.type === "text" && msg.text?.body) {
    return { from, text: msg.text.body };
  }

  return null;
}
