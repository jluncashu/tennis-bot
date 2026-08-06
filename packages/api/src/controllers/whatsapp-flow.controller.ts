import { Request, Response } from "express";
import { env } from "../config/env";
import { decryptRequest, encryptResponse } from "../shared/whatsapp-flow/flow-crypto";
import { routeFlowAction } from "../modules/booking/booking.flow";

export function handleFlowDataExchange(req: Request, res: Response) {
  try {
    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(
      req.body,
      env.WHATSAPP_FLOW_PRIVATE_KEY,
      env.WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE
    );

    const responseBody = routeFlowAction(decryptedBody as Parameters<typeof routeFlowAction>[0]);

    const encrypted = encryptResponse(responseBody, aesKeyBuffer, initialVectorBuffer);
    res.set("Content-Type", "text/plain").send(encrypted);
  } catch (err) {
    console.error("Flow data exchange failed:", err);
    // 421 tells the WhatsApp client the request couldn't be decrypted
    // (e.g. stale public key) rather than a generic server error.
    res.sendStatus(421);
  }
}
