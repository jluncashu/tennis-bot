import axios from "axios";
import { env } from "../config/env";

const GRAPH_URL = `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

function client() {
  return axios.create({
    baseURL: GRAPH_URL,
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

export async function sendText(to: string, body: string) {
  try {
    await client().post("", {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    });
  } catch (err: any) {
    console.error("sendText failed:", err.response?.data ?? err.message);
  }
}

export interface ReplyButton {
  id: string;
  title: string; // WhatsApp limit: 20 characters
}

// WhatsApp reply-button messages support at most 3 buttons; switch to a
// list message (type: "list") if a menu ever needs more than that.
export async function sendButtons(to: string, bodyText: string, buttons: ReplyButton[]) {
  try {
    await client().post("", {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.map(({ id, title }) => ({
            type: "reply",
            reply: { id, title },
          })),
        },
      },
    });
  } catch (err: any) {
    console.error("sendButtons failed:", err.response?.data ?? err.message);
  }
}