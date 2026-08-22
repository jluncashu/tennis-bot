import { api } from "./api";
import { useAuthStore } from "../store/auth.store";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

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
  priceRon: number | null; // null for bookings created before pricing existed
  createdAt: string;
}

export async function listBookings(from?: string, to?: string): Promise<ApiBooking[]> {
  const res = await api.get<ApiBooking[]>("/bookings", { params: { from, to } });
  return res.data;
}

export interface CreateBookingInput {
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  customerName: string;
  customerPhone: string;
}

export async function createBooking(data: CreateBookingInput): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>("/bookings", data);
  return res.data;
}

export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`);
}

export interface SearchAvailabilityParams {
  daysOfWeek: number[]; // empty = every day
  startTime: string; // HH:MM
  durationMinutes: number;
  courtType: "any" | "covered" | "uncovered";
  courtId?: string;
}

export interface SearchSlot {
  date: string; // YYYY-MM-DD
  weekday: number;
  courtId: string;
  courtName: string;
  covered: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface SearchLongTermOpportunity {
  courtId: string;
  courtName: string;
  covered: boolean;
  weekday: number;
  startTime: string;
  endTime: string;
  dates: string[];
}

export interface SearchAvailabilityResult {
  slots: SearchSlot[];
  longTerm: SearchLongTermOpportunity | null;
}

export async function searchAvailability(params: SearchAvailabilityParams): Promise<SearchAvailabilityResult> {
  const res = await api.get<SearchAvailabilityResult>("/availability/search", {
    params: {
      daysOfWeek: params.daysOfWeek.length > 0 ? params.daysOfWeek.join(",") : undefined,
      startTime: params.startTime,
      durationMinutes: params.durationMinutes,
      courtType: params.courtType,
      courtId: params.courtId,
    },
  });
  return res.data;
}

export async function exportBookings(date: string): Promise<void> {
  const res = await api.get("/bookings/export", {
    params: { date },
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"] as string | undefined;
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? `bookings-${date}.xlsx`;

  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// EventSource can't set an Authorization header, so the access token rides
// along as a query param instead — see requireAuthSSE on the API side.
export function subscribeToBookingEvents(onChange: () => void): () => void {
  const token = useAuthStore.getState().accessToken;
  if (!token) return () => {};

  const source = new EventSource(`${API_BASE}/bookings/events?token=${encodeURIComponent(token)}`);
  source.addEventListener("changed", onChange);
  return () => source.close();
}
