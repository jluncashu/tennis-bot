import { pgTable, date, text, time, timestamp, uuid, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { clubs } from "../clubs/clubs.schema";
import { courts } from "../courts/courts.schema";

export const scheduleExceptions = pgTable("schedule_exceptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id),
    courtId: uuid("court_id").references(() => courts.id), // null = whole club
    date: date("date").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    bothOrNeitherTime: check("both_or_neither_time", sql`(${table.startTime} IS NULL) = (${table.endTime} IS NULL)`),
    endAfterStart: check("exception_end_after_start", sql`${table.endTime} IS NULL OR ${table.endTime} > ${table.startTime}`),
}))

export type ScheduleException = typeof scheduleExceptions.$inferSelect;
export type NewScheduleException = typeof scheduleExceptions.$inferInsert;

// --- Request validation ---

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createExceptionSchema = z.object({
  courtId: z.string().uuid().optional(), // omit = whole club
  date: z.string().regex(dateRegex, "Expected YYYY-MM-DD"),
  startTime: z.string().regex(timeRegex, "Expected HH:MM").optional(),
  endTime: z.string().regex(timeRegex, "Expected HH:MM").optional(),
  reason: z.string().max(255).optional(),
}).refine((data) => (data.startTime == null) === (data.endTime == null), {
  message: "startTime and endTime must both be set or both omitted",
  path: ["endTime"],
}).refine((data) => !data.startTime || !data.endTime || data.endTime > data.startTime, {
  message: "endTime must be after startTime",
  path: ["endTime"],
});

export type CreateExceptionBody = z.infer<typeof createExceptionSchema>;