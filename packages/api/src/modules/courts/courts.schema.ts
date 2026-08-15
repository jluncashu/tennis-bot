import { boolean, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clubs } from "../clubs/clubs.schema";
import z from "zod";

export const courts = pgTable("courts", {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id),
    name: text("name").notNull(),
    slotDurationMinutes: smallint("slot_duration_minutes"),
    covered: boolean("covered").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;

export const createCourtSchema = z.object({
  name: z.string().min(1).max(100),
  slotDurationMinutes: z.number().int().positive().optional(),
  covered: z.boolean().optional(),
});

export const updateCourtSchema = createCourtSchema.partial();

export type CreateCourtBody = z.infer<typeof createCourtSchema>;
export type UpdateCourtBody = z.infer<typeof updateCourtSchema>;