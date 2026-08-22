import { findCourtsWithRulesByClub, findCourtById, createCourt, updateCourt, deleteCourt } from "./courts.repository";
import { httpError } from "../../shared/http-error";
import type { Court } from "./courts.schema";
import type { AvailabilityRule } from "../availability-rules/availability-rules.schema";
import type { CreateCourtBody, UpdateCourtBody } from "./courts.schema";

export interface CourtWithRules extends Court {
  rules: AvailabilityRule[];
}

export async function listCourts(clubId: string): Promise<CourtWithRules[]> {
  const rows = await findCourtsWithRulesByClub(clubId);
  const byCourtId = new Map<string, CourtWithRules>();
  for (const { court, rule } of rows) {
    if (!byCourtId.has(court.id)) byCourtId.set(court.id, { ...court, rules: [] });
    if (rule) byCourtId.get(court.id)!.rules.push(rule);
  }
  return Array.from(byCourtId.values());
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