import { pgTable, integer, smallint, time, uuid, check, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { courts } from "../courts/courts.schema";

export const priceRules = pgTable("price_rules", {
    id: uuid("id").primaryKey().defaultRandom(),
    courtId: uuid("court_id").notNull().references(() => courts.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(), // 0 = Sunday .. 6 = Saturday
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    priceRon: integer("price_ron").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    endAfterStart: check("end_after_start", sql`${table.endTime} > ${table.startTime}`),
}))

export type PriceRule = typeof priceRules.$inferSelect;
export type NewPriceRule = typeof priceRules.$inferInsert;

// --- Request validation ---

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM, 24h

export const createPriceRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Expected HH:MM"),
  endTime: z.string().regex(timeRegex, "Expected HH:MM"),
  priceRon: z.number().int().min(0),
}).refine((data) => data.endTime > data.startTime, {
  message: "endTime must be after startTime",
  path: ["endTime"],
});

export const updatePriceRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timeRegex, "Expected HH:MM").optional(),
  endTime: z.string().regex(timeRegex, "Expected HH:MM").optional(),
  priceRon: z.number().int().min(0).optional(),
});

export type CreatePriceRuleBody = z.infer<typeof createPriceRuleSchema>;
export type UpdatePriceRuleBody = z.infer<typeof updatePriceRuleSchema>;
