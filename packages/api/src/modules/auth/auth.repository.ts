import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { Club, clubs, NewClub } from "../clubs/clubs.schema";

export async function findClubByEmail(email: string): Promise<Club | null> {
  const [row] = await db
    .select()
    .from(clubs)
    .where(eq(clubs.email, email))
    .limit(1);
  return row ?? null;
}

export async function findClubById(id: string): Promise<Club | null> {
  const [row] = await db
    .select()
    .from(clubs)
    .where(eq(clubs.id, id))
    .limit(1);
  return row ?? null;
}

export async function createClub(
  data: Pick<NewClub, "name" | "email" | "passwordHash">
): Promise<Club> {
  const [row] = await db
    .insert(clubs)
    .values(data)
    .returning();
  return row;
}