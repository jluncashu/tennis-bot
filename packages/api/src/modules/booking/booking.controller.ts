import { Request, Response } from "express";
import { listBookingsForClub, cancelBookingForClub, createManualBooking } from "./booking.service";
import { createBookingSchema } from "./booking.schema";
import { subscribeToBookingEvents } from "../../services/booking-events.service";

const SSE_HEARTBEAT_MS = 25000; // keeps idle connections (and proxies) from timing out

export function streamBookingEvents(req: Request, res: Response) {
  const clubId = req.user!.id;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(":ok\n\n"); // flush headers immediately so the client's onopen fires

  const notify = () => res.write("event: changed\ndata: {}\n\n");
  const unsubscribe = subscribeToBookingEvents(clubId, notify);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), SSE_HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

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
