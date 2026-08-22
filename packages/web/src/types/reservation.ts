export type ReservationStatus = "confirmed" | "pending" | "cancelled";

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  durationMinutes?: number; // defaults to the club's slotDurationMinutes when absent
  court: string;
  customerName: string;
  customerPhone: string;
  status: ReservationStatus;
}
