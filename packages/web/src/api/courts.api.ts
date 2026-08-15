import { api } from "./api";

export interface ApiCourt {
  id: string;
  clubId: string;
  name: string;
  slotDurationMinutes: number | null;
  covered: boolean;
  createdAt: string;
}

export async function listCourts(): Promise<ApiCourt[]> {
  const res = await api.get<ApiCourt[]>("/courts");
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
