import { pgTable, integer, smallint, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const clubs = pgTable("clubs", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: varchar("email", { length: 100 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    whatsappPhoneNumberId: text("whatsapp_phone_number_id").unique(),
    timezone: text("timezone").notNull().default("Europe/Bucharest"),
    defaultSlotDurationMinutes: smallint("default_slot_duration_minutes").notNull().default(60),
    defaultPriceRon: integer("default_price_ron").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;