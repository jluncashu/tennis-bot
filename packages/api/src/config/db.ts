import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
import * as schema from "../db/schema";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Neon always terminates TLS with a publicly-trusted cert; skip strict
  // chain validation only to sidestep local/corporate root-store gaps.
  // ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });