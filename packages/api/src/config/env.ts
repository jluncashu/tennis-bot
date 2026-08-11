import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  // WHATSAPP_FLOW_ID: z.string().min(1),
  // PEM, stored with literal \n escapes in the env var; normalized to real newlines here.
  // WHATSAPP_FLOW_PRIVATE_KEY: z.string().min(1).transform((key) => key.replace(/\\n/g, "\n")),
  WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE: z.string().optional(),
  // "draft" while the flow hasn't passed Meta's publish check yet (only
  // deliverable to App Dashboard tester numbers); "published" once it has.
  WHATSAPP_FLOW_MODE: z.enum(["draft", "published"]).default("published"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32)
});

export const env = envSchema.parse(process.env);