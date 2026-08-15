import { Request, Response } from "express";
import { listBookingsForClub, cancelBookingForClub } from "./booking.service";

export async function listBookingsController(req: Request, res: Response) {
  const bookings = await listBookingsForClub(req.user!.id);
  res.json(bookings);
}

export async function cancelBookingController(req: Request, res: Response) {
  await cancelBookingForClub(req.params.id as string, req.user!.id);
  res.sendStatus(204);
}
