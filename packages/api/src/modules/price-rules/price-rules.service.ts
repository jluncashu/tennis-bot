import { getCourt } from "../courts/courts.service"; // throws 404 if court doesn't belong to this club
import { dayOfWeek } from "../booking-availability/booking-availability.service";
import {
  findRulesByCourt,
  findRuleById,
  createRule,
  updateRule,
  deleteRule,
} from "./price-rules.repository";
import { httpError } from "../../shared/http-error";
import type { CreatePriceRuleBody, UpdatePriceRuleBody } from "./price-rules.schema";

export async function listRulesForCourt(courtId: string, clubId: string) {
  await getCourt(courtId, clubId); // ownership check — throws 404 if not this club's court
  return findRulesByCourt(courtId);
}

export async function addRule(courtId: string, clubId: string, data: CreatePriceRuleBody) {
  await getCourt(courtId, clubId);
  return createRule({ courtId, ...data });
}

export async function editRule(id: string, courtId: string, clubId: string, data: UpdatePriceRuleBody) {
  await getCourt(courtId, clubId);
  const updated = await updateRule(id, courtId, data);
  if (!updated) throw httpError(404, "Price rule not found");
  return updated;
}

export async function removeRule(id: string, courtId: string, clubId: string) {
  await getCourt(courtId, clubId);
  const deleted = await deleteRule(id, courtId);
  if (!deleted) throw httpError(404, "Price rule not found");
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// The price charged for a booking starting at startTime on this court/date:
// the first matching day-of-week + time-window rule, or the club's default
// if no rule covers that slot.
export async function getEffectivePrice(courtId: string, date: string, startTime: string, defaultPriceRon: number): Promise<number> {
  const dow = dayOfWeek(date);
  const startMinutes = toMinutes(startTime);
  const rules = await findRulesByCourt(courtId);
  const match = rules.find(
    (r) => r.dayOfWeek === dow && toMinutes(r.startTime) <= startMinutes && startMinutes < toMinutes(r.endTime)
  );
  return match ? match.priceRon : defaultPriceRon;
}
