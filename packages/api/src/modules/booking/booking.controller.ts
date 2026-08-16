import { Request, Response } from "express";
import { listBookingsForClub, cancelBookingForClub, createManualBooking } from "./booking.service";
import { createBookingSchema } from "./booking.schema";

export async function listBookingsController(req: Request, res: Response) {
  const bookings = await listBookingsForClub(req.user!.id);
  res.json(bookings);
}

export async function createBookingController(req: Request, res: Response) {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { courtId, date, startTime, endTime, customerPhone, customerName } = parsed.data;
  const booking = await createManualBooking(req.user!.id, courtId, date, startTime, endTime, customerPhone, customerName);
  res.status(201).json(booking);
}

export async function cancelBookingController(req: Request, res: Response) {
  await cancelBookingForClub(req.params.id as string, req.user!.id);
  res.sendStatus(204);
}
