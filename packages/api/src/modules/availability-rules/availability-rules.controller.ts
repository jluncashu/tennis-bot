import { Request, Response } from "express";
import { listRulesForCourt, addRule, editRule, removeRule } from "./availability-rules.service";
import { createAvailabilityRuleSchema, updateAvailabilityRuleSchema } from "./availability-rules.schema";

export async function listRulesController(req: Request, res: Response) {
  const rules = await listRulesForCourt(req.params.courtId as string, req.user!.id);
  res.json(rules);
}

export async function createRuleController(req: Request, res: Response) {
  const parsed = createAvailabilityRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const rule = await addRule(req.params.courtId as string, req.user!.id, parsed.data);
  res.status(201).json(rule);
}

export async function updateRuleController(req: Request, res: Response) {
  const parsed = updateAvailabilityRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const rule = await editRule(
    req.params.id as string,
    req.params.courtId as string,
    req.user!.id,
    parsed.data
  );
  res.json(rule);
}

export async function deleteRuleController(req: Request, res: Response) {
  await removeRule(req.params.id as string, req.params.courtId as string, req.user!.id);
  res.sendStatus(204);
}