import { api } from "./api";
import type { ApiAvailabilityRule } from "./availabilityRules.api";

export interface ApiCourt {
  id: string;
  clubId: string;
  name: string;
  slotDurationMinutes: number | null;
  covered: boolean;
  createdAt: string;
}

// GET /courts embeds each court's availability rules (single joined query
// server-side) so callers like the Reservations calendar don't need a
// separate per-court request just to know a court's open hours.
export interface ApiCourtWithRules extends ApiCourt {
  rules: ApiAvailabilityRule[];
}

export async function listCourts(): Promise<ApiCourtWithRules[]> {
  const res = await api.get<ApiCourtWithRules[]>("/courts");
  return res.data;
}

export async function createCourt(data: {
  name: string;
  slotDurationMinutes?: number;
  covered?: boolean;
}): Promise<ApiCourt> {
  const res = await api.post<ApiCourt>("/courts", data);
  return res.data;
}

export async function updateCourt(
  id: string,
  data: { name?: string; slotDurationMinutes?: number; covered?: boolean }
): Promise<ApiCourt> {
  const res = await api.patch<ApiCourt>(`/courts/${id}`, data);
  return res.data;
}

export async function deleteCourt(id: string): Promise<void> {
  await api.delete(`/courts/${id}`);
}
