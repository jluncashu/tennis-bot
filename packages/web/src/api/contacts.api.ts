import { api } from "./api";

export interface ApiContact {
  id: string;
  phone: string;
  name: string | null;
  createdAt: string;
  bookingsCount: number;
  lastBookingDate: string | null; // YYYY-MM-DD
}

export interface ApiContactBooking {
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

export async function listContacts(): Promise<ApiContact[]> {
  const res = await api.get<ApiContact[]>("/contacts");
  return res.data;
}

export async function listContactBookings(contactId: string): Promise<ApiContactBooking[]> {
  const res = await api.get<ApiContactBooking[]>(`/contacts/${contactId}/bookings`);
  return res.data;
}
