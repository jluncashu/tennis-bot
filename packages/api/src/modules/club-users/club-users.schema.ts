import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { clubs } from "../clubs/clubs.schema";

export const clubUsers = pgTable("club_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull().references(() => clubs.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"), // 'owner' | 'staff'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ClubUser = typeof clubUsers.$inferSelect;
export type NewClubUser = typeof clubUsers.$inferInsert;