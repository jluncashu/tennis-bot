import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { ScheduleException, scheduleExceptions, NewScheduleException } from "./schedule-exceptions.schema";

export async function findExceptionsForClub(clubId: string): Promise<ScheduleException[]> {
  return db.select().from(scheduleExceptions).where(eq(scheduleExceptions.clubId, clubId));
}

export async function findExceptionById(id: string, clubId: string): Promise<ScheduleException | null> {
  const [row] = await db
    .select()
    .from(scheduleExceptions)
    .where(and(eq(scheduleExceptions.id, id), eq(scheduleExceptions.clubId, clubId)))
    .limit(1);
  return row ?? null;
}

export async function createException(data: NewScheduleException): Promise<ScheduleException> {
  const [row] = await db.insert(scheduleExceptions).values(data).returning();
  return row;
}

export async function deleteException(id: string, clubId: string): Promise<boolean> {
  const result = await db
    .delete(scheduleExceptions)
    .where(and(eq(scheduleExceptions.id, id), eq(scheduleExceptions.clubId, clubId)))
    .returning();
  return result.length > 0;
}