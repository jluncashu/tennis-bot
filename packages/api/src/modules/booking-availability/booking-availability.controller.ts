import { Request, Response } from "express";
import { getAvailableSlots } from "./booking-availability.service";

export async function debugAvailabilityController(req: Request, res: Response) {
  const slots = await getAvailableSlots(req.user!.id, req.params.courtId as string, req.params.date as string);
  res.json(slots);
}
