import { Request, Response } from "express";
import { listReservations } from "./reservations.service";
import { listReservationsQuerySchema } from "./reservations.schema";

export function listReservationsController(req: Request, res: Response) {
  const parsed = listReservationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const reservations = listReservations(parsed.data);
  res.json({ reservations });
}
