import { pgTable, date, integer, text, time, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
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
    status: text("status").notNull().default("confirmed"), // 'confirmed' — cancelled bookings are deleted, not soft-cancelled
    // Price at time of booking (RON). Nullable: bookings created before pricing
    // existed have no known price — never null for bookings created from here on.
    priceRon: integer("price_ron"),
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
// Digits only, optional leading +, 7-15 digits — matches whatever format a
// number arrives in (WhatsApp sends bare digits, e.g. "40730452121"; a
// manually-typed number might have a leading +). Not full E.164 validation,
// just enough to reject obviously-not-a-phone-number input from the
// dashboard's manual booking forms — this endpoint isn't used by the
// WhatsApp flow, which calls the booking service directly.
const phoneRegex = /^\+?[0-9]{7,15}$/;

export const createBookingSchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(dateRegex, "Expected YYYY-MM-DD"),
  startTime: z.string().regex(timeRegex, "Expected HH:MM"),
  endTime: z.string().regex(timeRegex, "Expected HH:MM"),
  customerPhone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  customerName: z.string().min(1).optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: "endTime must be after startTime",
  path: ["endTime"],
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;

export const exportBookingsQuerySchema = z.object({
  date: z.string().regex(dateRegex, "Expected YYYY-MM-DD"),
});

export type ExportBookingsQuery = z.infer<typeof exportBookingsQuerySchema>;

// Both optional so the endpoint still works unscoped if a future caller needs
// that, but the dashboard always passes the visible date range now — no
// reason to ship a club's entire booking history on every date navigation.
export const listBookingsQuerySchema = z.object({
  from: z.string().regex(dateRegex, "Expected YYYY-MM-DD").optional(),
  to: z.string().regex(dateRegex, "Expected YYYY-MM-DD").optional(),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;