import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { PriceRule, priceRules, NewPriceRule } from "./price-rules.schema";

export async function findRulesByCourt(courtId: string): Promise<PriceRule[]> {
  return db.select().from(priceRules).where(eq(priceRules.courtId, courtId));
}

export async function findRuleById(id: string, courtId: string): Promise<PriceRule | null> {
  const [row] = await db
    .select()
    .from(priceRules)
    .where(and(eq(priceRules.id, id), eq(priceRules.courtId, courtId)))
    .limit(1);
  return row ?? null;
}

export async function createRule(data: NewPriceRule): Promise<PriceRule> {
  const [row] = await db.insert(priceRules).values(data).returning();
  return row;
}

export async function updateRule(
  id: string,
  courtId: string,
  data: Partial<Pick<NewPriceRule, "dayOfWeek" | "startTime" | "endTime" | "priceRon">>
): Promise<PriceRule | null> {
  const [row] = await db
    .update(priceRules)
    .set(data)
    .where(and(eq(priceRules.id, id), eq(priceRules.courtId, courtId)))
    .returning();
  return row ?? null;
}

export async function deleteRule(id: string, courtId: string): Promise<boolean> {
  const result = await db
    .delete(priceRules)
    .where(and(eq(priceRules.id, id), eq(priceRules.courtId, courtId)))
    .returning();
  return result.length > 0;
}
