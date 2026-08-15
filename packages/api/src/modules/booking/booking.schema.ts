import { pgTable, date, text, time, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { courts } from "../courts/courts.schema";
import { contacts } from "../contacts/contacts.schema";

export const bookings = pgTable("bookings", {
    id: uuid("id").primaryKey().defaultRandom(),
    courtId: uuid("court_id").notNull().references(() => courts.id),
    customerId: uuid("customer_id").notNull().references(() => contacts.id),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: text("status").notNull().default("confirmed"), // 'confirmed' | 'cancelled'
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    noDoubleBooking: uniqueIndex("no_double_booking")
        .on(table.courtId, table.date, table.startTime)
        .where(sql`${table.status} = 'confirmed'`),
}))

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;