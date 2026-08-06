import crypto from "crypto";

// Implements Meta's WhatsApp Flows Data Exchange encryption contract:
// https://developers.facebook.com/docs/whatsapp/flows/reference/flowsdataendpoint
// The AES key arrives RSA-OAEP(SHA-256)-wrapped; the flow payload is
// AES-128-GCM with a 16-byte tag appended. Responses reuse the same AES
// key but with every bit of the IV flipped, per spec.

export interface EncryptedFlowRequest {
  encrypted_flow_data: string;
  encrypted_aes_key: string;
  initial_vector: string;
}

export interface DecryptedFlowRequest {
  decryptedBody: Record<string, any>;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
}

const AUTH_TAG_LENGTH = 16;

export function decryptRequest(
  body: EncryptedFlowRequest,
  privateKeyPem: string,
  passphrase?: string
): DecryptedFlowRequest {
  const privateKey = crypto.createPrivateKey({ key: privateKeyPem, passphrase });

  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(body.encrypted_aes_key, "base64")
  );

  const flowDataBuffer = Buffer.from(body.encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(body.initial_vector, "base64");

  const encryptedBody = flowDataBuffer.subarray(0, -AUTH_TAG_LENGTH);
  const authTag = flowDataBuffer.subarray(-AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-128-gcm", aesKeyBuffer, initialVectorBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedBody), decipher.final()]).toString(
    "utf-8"
  );

  return {
    decryptedBody: JSON.parse(decrypted),
    aesKeyBuffer,
    initialVectorBuffer,
  };
}

export function encryptResponse(
  response: Record<string, unknown>,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string {
  const flippedIv = Buffer.from(initialVectorBuffer.map((byte) => ~byte));

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKeyBuffer, flippedIv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return encrypted.toString("base64");
}
