import { getCourt } from "../courts/courts.service"; // throws 404 if court doesn't belong to this club
import {
  findRulesByCourt,
  findRuleById,
  createRule,
  updateRule,
  deleteRule,
} from "./availability-rules.repository";
import { httpError } from "../../shared/http-error";
import type { CreateAvailabilityRuleBody, UpdateAvailabilityRuleBody } from "./availability-rules.schema";

export async function listRulesForCourt(courtId: string, clubId: string) {
  await getCourt(courtId, clubId); // ownership check — throws 404 if not this club's court
  return findRulesByCourt(courtId);
}

export async function addRule(courtId: string, clubId: string, data: CreateAvailabilityRuleBody) {
  await getCourt(courtId, clubId);
  return createRule({ courtId, ...data });
}

export async function editRule(id: string, courtId: string, clubId: string, data: UpdateAvailabilityRuleBody) {
  await getCourt(courtId, clubId);
  const updated = await updateRule(id, courtId, data);
  if (!updated) throw httpError(404, "Availability rule not found");
  return updated;
}

export async function removeRule(id: string, courtId: string, clubId: string) {
  await getCourt(courtId, clubId);
  const deleted = await deleteRule(id, courtId);
  if (!deleted) throw httpError(404, "Availability rule not found");
}