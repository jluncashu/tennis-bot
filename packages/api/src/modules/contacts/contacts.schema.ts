import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contacts = pgTable("contacts", {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull().unique(), // E.164 format, e.g. +40730452121
    name: text("name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;