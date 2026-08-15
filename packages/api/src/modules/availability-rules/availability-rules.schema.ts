import { pgTable, smallint, time, uuid, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { courts } from "../courts/courts.schema";

export const availabilityRules = pgTable("availability_rules", {
    id: uuid("id").primaryKey().defaultRandom(),
    courtId: uuid("court_id").notNull().references(() => courts.id),
    dayOfWeek: smallint("day_of_week").notNull(), // 0 = Sunday .. 6 = Saturday
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
}, (table) => ({
    endAfterStart: check("end_after_start", sql`${table.endTime} > ${table.startTime}`),
}))

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type NewAvailabilityRule = typeof availabilityRules.$inferInsert;

// --- Request validation ---

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM, 24h

export const createAvailabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Expected HH:MM"),
  endTime: z.string().regex(timeRegex, "Expected HH:MM"),
}).refine((data) => data.endTime > data.startTime, {
  message: "endTime must be after startTime",
  path: ["endTime"],
});

export const updateAvailabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timeRegex, "Expected HH:MM").optional(),
  endTime: z.string().regex(timeRegex, "Expected HH:MM").optional(),
});

export type CreateAvailabilityRuleBody = z.infer<typeof createAvailabilityRuleSchema>;
export type UpdateAvailabilityRuleBody = z.infer<typeof updateAvailabilityRuleSchema>;