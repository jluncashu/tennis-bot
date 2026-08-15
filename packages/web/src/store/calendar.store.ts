import { create } from "zustand";

interface CalendarState {
  // Set when the sidebar mini-calendar is used to jump to a date; ReservationsPage
  // watches this and moves its own range to include it. Not synced the other way.
  focusDate: Date | null;
  goToDate: (date: Date) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  focusDate: null,
  goToDate: (date) => set({ focusDate: date }),
}));
