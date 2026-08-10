import { Request, Response } from "express";
import { getSettings, updateSettings } from "./settings.service";
import { updateSettingsSchema } from "./settings.schema";

export function getSettingsController(_req: Request, res: Response) {
  res.json(getSettings());
}

export function updateSettingsController(req: Request, res: Response) {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const settings = updateSettings(parsed.data);
  res.json(settings);
}
