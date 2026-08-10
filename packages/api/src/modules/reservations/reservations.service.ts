import { mockReservations } from "./reservations.repository";
import type { ListReservationsQuery, Reservation } from "./reservations.schema";

export function listReservations(query: ListReservationsQuery): Reservation[] {
  return mockReservations(query.date, query.weekOffset ?? 0);
}
