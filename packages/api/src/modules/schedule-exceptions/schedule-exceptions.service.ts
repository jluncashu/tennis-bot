import { getCourt } from "../courts/courts.service"; // throws 404 if court isn't this club's
import {
  findExceptionsForClub,
  findExceptionById,
  createException,
  deleteException,
} from "./schedule-exceptions.repository";
import { httpError } from "../../shared/http-error";
import type { CreateExceptionBody } from "./schedule-exceptions.schema";

export async function listExceptions(clubId: string) {
  return findExceptionsForClub(clubId);
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