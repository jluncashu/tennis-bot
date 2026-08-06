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

export interface FlowTrigger {
  flowId: string;
  flowToken: string;
  headerText: string;
  bodyText: string;
  ctaText: string;
  initialScreen: string;
  initialData?: Record<string, unknown>;
  // "draft" sends the flow's unpublished version — only deliverable to
  // numbers registered as testers in the App Dashboard. Omit (or
  // "published") once the flow has passed Meta's publish/integrity check.
  mode?: "draft" | "published";
}

export async function sendFlow(to: string, flow: FlowTrigger) {
  try {
    await client().post("", {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "flow",
        header: { type: "text", text: flow.headerText },
        body: { text: flow.bodyText },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: flow.flowToken,
            flow_id: flow.flowId,
            flow_cta: flow.ctaText,
            flow_action: "navigate",
            flow_action_payload: {
              screen: flow.initialScreen,
              data: flow.initialData ?? {},
            },
            ...(flow.mode ? { mode: flow.mode } : {}),
          },
        },
      },
    });
  } catch (err: any) {
    console.error("sendFlow failed:", err.response?.data ?? err.message);
  }
}