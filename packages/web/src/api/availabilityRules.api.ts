import { api } from "./api";

export interface ApiAvailabilityRule {
  id: string;
  courtId: string;
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // HH:MM:SS
  endTime: string;
}

export async function listAvailabilityRules(courtId: string): Promise<ApiAvailabilityRule[]> {
  const res = await api.get<ApiAvailabilityRule[]>(`/courts/${courtId}/availability-rules`);
  return res.data;
}

export async function createAvailabilityRule(
  courtId: string,
  data: { dayOfWeek: number; startTime: string; endTime: string }
): Promise<ApiAvailabilityRule> {
  const res = await api.post<ApiAvailabilityRule>(`/courts/${courtId}/availability-rules`, data);
  return res.data;
}

export async function deleteAvailabilityRule(courtId: string, id: string): Promise<void> {
  await api.delete(`/courts/${courtId}/availability-rules/${id}`);
}
