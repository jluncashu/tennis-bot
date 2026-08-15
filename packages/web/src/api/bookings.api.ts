import { api } from "./api";

export interface ApiBooking {
  id: string;
  courtId: string;
  courtName: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  status: "confirmed" | "cancelled";
  createdAt: string;
}

export async function listBookings(): Promise<ApiBooking[]> {
  const res = await api.get<ApiBooking[]>("/bookings");
  return res.data;
}
