import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { env } from "../config/env";
import { sendText, sendFlow } from "../services/whatsapp.service";
import { registerIncomingMessage } from "../modules/contacts/contacts.service";
import { FLOW_SCREENS } from "../modules/booking/booking.flow";
import { getWeekDates, buildSummary } from "../modules/booking/booking.service";
import { handleIncomingMessage, handleListReply } from "../services/conversation.service";

const BOOKING_FLOW_NAME = "Rezervare Teren Tenis Tineretului";

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

// export async function receiveMessage(req: Request, res: Response) {
//   res.sendStatus(200); // ack immediately, Meta retries on timeout

//   const entry = req.body?.entry?.[0];
//   const change = entry?.changes?.[0];
//   const msg = change?.value?.messages?.[0];
//   if (!msg) return; // status update, not an actual message

//   const from = msg.from;
//   const { isNewConversation } = await registerIncomingMessage(from);

//   if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
//     await handleFlowCompletion(from, msg.interactive.nfm_reply);
//     return;
//   }

//   if (isNewConversation) {
//     await sendText(from, "Intro");
//   }
//   await sendBookingFlow(from);
// }

export async function receiveMessage(req: Request, res: Response) {
  res.sendStatus(200);
  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return;

  if (msg.type === "interactive" && msg.interactive?.type === "list_reply") {
    await handleListReply(msg.from, msg.interactive.list_reply.id);
    return;
  }

  if (msg.text) {
    await handleIncomingMessage(msg.from, msg.text.body);
  }
}

async function handleFlowCompletion(from: string, nfmReply: { response_json: string }) {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(nfmReply.response_json);
  } catch (err) {
    console.error("Failed to parse WhatsApp Flow response_json:", err);
  }

  const dateId = data.date_id as string;
  const slotId = data.slot_id as string;
  const fieldId = data.field_id as string;

  // Mock only — no reservations table yet, so nothing is persisted.
  console.log("Booking flow submitted (mock):", data);

  await sendText(
    from,
    `Rezervare înregistrată (mock): ${buildSummary(dateId, slotId, fieldId)}. Te contactăm pentru confirmare! 🎾`
  );
}

// function sendBookingFlow(to: string) {
//   const { dates, weekOffset } = getWeekDates(0);
//   return sendFlow(to, {
//     flowId: env.WHATSAPP_FLOW_ID,
//     flowToken: randomUUID(),
//     headerText: BOOKING_FLOW_NAME,
//     bodyText: "Rezervă un teren în câțiva pași simpli.",
//     ctaText: "Rezervă acum",
//     initialScreen: FLOW_SCREENS.DATE_SELECT,
//     initialData: { dates, week_offset: weekOffset },
//     mode: env.WHATSAPP_FLOW_MODE,
//   });
// }


