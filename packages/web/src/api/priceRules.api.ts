import { api } from "./api";

export interface ApiPriceRule {
  id: string;
  courtId: string;
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // HH:MM:SS
  endTime: string;
  priceRon: number;
}

export async function listPriceRules(courtId: string): Promise<ApiPriceRule[]> {
  const res = await api.get<ApiPriceRule[]>(`/courts/${courtId}/price-rules`);
  return res.data;
}

export async function createPriceRule(
  courtId: string,
  data: { dayOfWeek: number; startTime: string; endTime: string; priceRon: number }
): Promise<ApiPriceRule> {
  const res = await api.post<ApiPriceRule>(`/courts/${courtId}/price-rules`, data);
  return res.data;
}

export async function deletePriceRule(courtId: string, id: string): Promise<void> {
  await api.delete(`/courts/${courtId}/price-rules/${id}`);
}
