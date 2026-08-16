import { getCourt } from "../courts/courts.service"; // throws 404 if court isn't this club's
import {
  findExceptionsForClub,
  findExceptionById,
  createException,
  deleteException,
} from "./schedule-exceptions.repository";
import { httpError } from "../../shared/http-error";
import type { CreateExceptionBody, ScheduleException } from "./schedule-exceptions.schema";

export async function listExceptions(clubId: string) {
  return findExceptionsForClub(clubId);
}

// A whole-day, club-wide closure: courtId null (applies to every court) and
// startTime null (blocks the entire day, not just a window within it).
export async function findClubWideClosure(clubId: string, date: string): Promise<ScheduleException | null> {
  const exceptions = await findExceptionsForClub(clubId);
  return exceptions.find((e) => e.courtId === null && e.date === date && e.startTime === null) ?? null;
}

export async function addException(clubId: string, data: CreateExceptionBody) {
  if (data.courtId) {
    await getCourt(data.courtId, clubId); // ensures this club actually owns that court
  }
  return createException({ clubId, ...data });
}

export async function removeException(id: string, clubId: string) {
  const deleted = await deleteException(id, clubId);
  if (!deleted) throw httpError(404, "Schedule exception not found");
}