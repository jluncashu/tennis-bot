import { Request, Response } from "express";
import { getAvailableSlots, searchAvailability } from "./booking-availability.service";
import { searchAvailabilityQuerySchema } from "./booking-availability.schema";

export async function debugAvailabilityController(req: Request, res: Response) {
  const slots = await getAvailableSlots(req.user!.id, req.params.courtId as string, req.params.date as string);
  res.json(slots);
}

export async function searchAvailabilityController(req: Request, res: Response) {
  const parsed = searchAvailabilityQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const result = await searchAvailability(req.user!.id, parsed.data);
  res.json(result);
}
