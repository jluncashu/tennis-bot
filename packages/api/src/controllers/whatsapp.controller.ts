import { Request, Response } from "express";
import { env } from "../config/env";
import { sendText, sendButtons } from "../services/whatsapp.service";
import { registerIncomingMessage } from "../modules/contacts/contacts.service";

const BUTTON_BOOK_COURT = "book_court";

export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified.");
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
}

export async function receiveMessage(req: Request, res: Response) {
  res.sendStatus(200); // ack immediately, Meta retries on timeout

  const entry = req.body?.entry?.[0];
  const change = entry?.changes?.[0];
  const msg = change?.value?.messages?.[0];
  if (!msg) return; // status update, not an actual message

  const from = msg.from;
  const { isNewConversation } = await registerIncomingMessage(from);

  if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
    await handleButtonReply(from, msg.interactive.button_reply.id);
    return;
  }

  if (isNewConversation) {
    await sendText(from, "Intro");
  }
  await sendMainMenu(from);
}

async function handleButtonReply(from: string, buttonId: string) {
  if (buttonId === BUTTON_BOOK_COURT) {
    // No courts/availability data model yet — see docs/app/db-schema.md.
    await sendText(from, "Rezervările vin în curând! 🎾");
    return;
  }
  await sendMainMenu(from);
}

function sendMainMenu(to: string) {
  return sendButtons(to, "Bună! Cu ce te pot ajuta?", [
    { id: BUTTON_BOOK_COURT, title: "Rezerva teren" },
  ]);
}