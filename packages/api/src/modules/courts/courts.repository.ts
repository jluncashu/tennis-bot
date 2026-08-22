import { eq, and, asc } from "drizzle-orm";
import { db } from "../../config/db";
import { Court, courts, NewCourt } from "./courts.schema";
import { AvailabilityRule, availabilityRules } from "../availability-rules/availability-rules.schema";

export interface CourtRuleRow {
  court: Court;
  rule: AvailabilityRule | null; // null when a court has no rules yet (LEFT JOIN)
}

// One query for the whole club instead of the list endpoint's callers each
// following up with a separate per-court availability-rules request. Ordered
// by court createdAt (not left to whatever Postgres returns) since the
// frontend assigns court colors by list position — see buildCourtColorMap.
export async function findCourtsWithRulesByClub(clubId: string): Promise<CourtRuleRow[]> {
  return db
    .select({ court: courts, rule: availabilityRules })
    .from(courts)
    .leftJoin(availabilityRules, eq(availabilityRules.courtId, courts.id))
    .where(eq(courts.clubId, clubId))
    .orderBy(asc(courts.createdAt), asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime));
}

export async function findCourtById(id: string, clubId: string): Promise<Court | null> {
  const [row] = await db
    .select()
    .from(courts)
    .where(and(eq(courts.id, id), eq(courts.clubId, clubId)))
    .limit(1);
  return row ?? null;
}

export async function createCourt(data: NewCourt): Promise<Court> {
  const [row] = await db.insert(courts).values(data).returning();
  return row;
}

export async function updateCourt(
  id: string,
  clubId: string,
  data: Partial<Pick<NewCourt, "name" | "slotDurationMinutes" | "covered">>
): Promise<Court | null> {
  const [row] = await db
    .update(courts)
    .set(data)
    .where(and(eq(courts.id, id), eq(courts.clubId, clubId)))
    .returning();
  return row ?? null;
}

export async function deleteCourt(id: string, clubId: string): Promise<boolean> {
  const result = await db
    .delete(courts)
    .where(and(eq(courts.id, id), eq(courts.clubId, clubId)))
    .returning();
  return result.length > 0;
}