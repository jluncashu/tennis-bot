import { findCourtsByClub, findCourtById, createCourt, updateCourt, deleteCourt } from "./courts.repository";
import { httpError } from "../../shared/http-error";
import type { CreateCourtBody, UpdateCourtBody } from "./courts.schema";

export async function listCourts(clubId: string) {
  return findCourtsByClub(clubId);
}

export async function getCourt(id: string, clubId: string) {
  const court = await findCourtById(id, clubId);
  if (!court) throw httpError(404, "Court not found");
  return court;
}

export async function addCourt(clubId: string, data: CreateCourtBody) {
  return createCourt({ clubId, ...data });
}

export async function editCourt(id: string, clubId: string, data: UpdateCourtBody) {
  const updated = await updateCourt(id, clubId, data);
  if (!updated) throw httpError(404, "Court not found");
  return updated;
}

export async function removeCourt(id: string, clubId: string) {
  const deleted = await deleteCourt(id, clubId);
  if (!deleted) throw httpError(404, "Court not found");
}