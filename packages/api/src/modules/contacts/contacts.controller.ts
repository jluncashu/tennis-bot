import { Request, Response } from "express";
import { listContactsForClub } from "./contacts.service";
import { listBookingsForContactInClub } from "../booking/booking.service";

export async function listContactsController(req: Request, res: Response) {
  const contacts = await listContactsForClub(req.user!.id);
  res.json(contacts);
}

export async function listContactBookingsController(req: Request, res: Response) {
  const bookings = await listBookingsForContactInClub(req.user!.id, req.params.id as string);
  res.json(bookings);
}
