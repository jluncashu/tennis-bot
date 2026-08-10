import { z } from "zod";

export const listReservationsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekOffset: z.coerce.number().int().optional(),
});

export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;

export type ReservationStatus = "confirmed" | "pending" | "cancelled";

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  court: string;
  customerName: string;
  customerPhone: string;
  status: ReservationStatus;
}
