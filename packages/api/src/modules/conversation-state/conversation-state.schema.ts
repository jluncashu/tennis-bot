import { pgTable, jsonb, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { clubs } from "../clubs/clubs.schema";

export const conversationState = pgTable("conversation_state", {
    clubId: uuid("club_id").notNull().references(() => clubs.id),
    phone: text("phone").notNull(),
    step: text("step").notNull(), // 'choose_date' | 'choose_court' | 'choose_time' | 'choose_duration' | 'ask_name' | 'confirm' | 'cancel_pick'
    data: jsonb("data").notNull().default({}),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.clubId, table.phone] }),
}))

export type ConversationState = typeof conversationState.$inferSelect;
export type NewConversationState = typeof conversationState.$inferInsert;