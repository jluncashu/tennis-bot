import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { AvailabilityRule, availabilityRules, NewAvailabilityRule } from "./availability-rules.schema";

export async function findRulesByCourt(courtId: string): Promise<AvailabilityRule[]> {
  return db.select().from(availabilityRules).where(eq(availabilityRules.courtId, courtId));
}

export async function findRuleById(id: string, courtId: string): Promise<AvailabilityRule | null> {
  const [row] = await db
    .select()
    .from(availabilityRules)
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.courtId, courtId)))
    .limit(1);
  return row ?? null;
}

export async function createRule(data: NewAvailabilityRule): Promise<AvailabilityRule> {
  const [row] = await db.insert(availabilityRules).values(data).returning();
  return row;
}

export async function updateRule(
  id: string,
  courtId: string,
  data: Partial<Pick<NewAvailabilityRule, "dayOfWeek" | "startTime" | "endTime">>
): Promise<AvailabilityRule | null> {
  const [row] = await db
    .update(availabilityRules)
    .set(data)
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.courtId, courtId)))
    .returning();
  return row ?? null;
}

export async function deleteRule(id: string, courtId: string): Promise<boolean> {
  const result = await db
    .delete(availabilityRules)
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.courtId, courtId)))
    .returning();
  return result.length > 0;
}