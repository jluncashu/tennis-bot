import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { Court, courts, NewCourt } from "./courts.schema";

export async function findCourtsByClub(clubId: string): Promise<Court[]> {
  return db.select().from(courts).where(eq(courts.clubId, clubId));
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