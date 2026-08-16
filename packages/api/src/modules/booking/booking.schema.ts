import { pgTable, date, text, time, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { courts } from "../courts/courts.schema";
import { contacts } from "../contacts/contacts.schema";

export const bookings = pgTable("bookings", {
    id: uuid("id").primaryKey().defaultRandom(),
    courtId: uuid("court_id").notNull().references(() => courts.id, { onDelete: "cascade" }),
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

// --- Request validation ---

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM, 24h
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createBookingSchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(dateRegex, "Expected YYYY-MM-DD"),
  startTime: z.string().regex(timeRegex, "Expected HH:MM"),
  endTime: z.string().regex(timeRegex, "Expected HH:MM"),
  customerPhone: z.string().min(1),
  customerName: z.string().min(1).optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: "endTime must be after startTime",
  path: ["endTime"],
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;