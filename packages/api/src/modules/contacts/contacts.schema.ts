import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const contacts = pgTable("contacts", {
  phone: text("phone").primaryKey(), // WhatsApp "from" number, e.g. "40712345678"
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
