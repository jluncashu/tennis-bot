import { Request, Response } from "express";
import { env } from "../config/env";
import { sendText } from "../services/whatsapp.service";

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
  const text = msg.text?.body ?? "(non-text message)";
  console.log(`Message from ${from}: ${text}`);

  // Simple echo for now, just to prove the round-trip works
  await sendText(from, `You said: ${text}`);
}