import axios from "axios";
import { api } from "./api";

// ── Types ────────────────────────────────────────────────────────────────────

interface Club {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  accessToken: string;
  club: Club;
}

// ── Error helper ─────────────────────────────────────────────────────────────

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return "Something went wrong. Try again.";
}

// ── Auth calls ───────────────────────────────────────────────────────────────

export async function registerApi(data: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/register", data);
  return res.data;
}

export async function loginApi(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", data);
  return res.data;
}

export async function refreshApi(): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/refresh");
  return res.data;
}

export async function logoutApi(): Promise<void> {
  await api.post("/auth/logout");
}