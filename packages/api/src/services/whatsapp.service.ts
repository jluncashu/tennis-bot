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