import { create } from "zustand";

interface Club {
  id: string;
  name: string;
  email: string;
  defaultSlotDurationMinutes: number;
  defaultPriceRon: number;
}

interface AuthState {
  club: Club | null;
  accessToken: string | null;

  setAuth: (club: Club, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  club: null,
  accessToken: null,

  setAuth: (club, accessToken) =>
    set({ club, accessToken }),

  logout: () =>
    set({ club: null, accessToken: null }),
}));