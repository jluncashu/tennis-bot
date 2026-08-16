// Local mock data — no backend call involved. Mirrors the logic in
// packages/api/src/modules/reservations/reservations.repository.ts so the
// dashboard keeps behaving the same if that endpoint goes away later.

import { toDateId } from "../lib/date";

export type ReservationStatus = "confirmed" | "pending" | "cancelled";

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  durationMinutes?: number; // defaults to the club's slotDurationMinutes when absent
  court: string;
  customerName: string;
  customerPhone: string;
  status: ReservationStatus;
}

const COURTS = ["Teren 1", "Teren 2", "Teren 3"];
const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;
const STATUSES: ReservationStatus[] = ["confirmed", "confirmed", "confirmed", "pending", "cancelled"];

const CUSTOMERS = [
  { name: "Andrei Popescu", phone: "+40712345001" },
  { name: "Maria Ionescu", phone: "+40712345002" },
  { name: "Mihai Georgescu", phone: "+40712345003" },
  { name: "Ioana Dumitrescu", phone: "+40712345004" },
  { name: "Alexandru Stan", phone: "+40712345005" },
  { name: "Elena Radu", phone: "+40712345006" },
  { name: "Cristian Munteanu", phone: "+40712345007" },
  { name: "Ana Constantin", phone: "+40712345008" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic per day: same date always yields the same mock reservations.
// Walks a seeded LCG and skips (hour, court) pairs already used that day, so
// no two reservations ever collide on the same court at the same time.
function mockReservationsForDate(dateId: string): Reservation[] {
  const seed = hashString(dateId);
  const count = 2 + (seed % 3); // 2-4 reservations per day
  const reservations: Reservation[] = [];
  const usedSlots = new Set<string>();

  let cursor = seed || 1;
  while (reservations.length < count) {
    cursor = (cursor * 1103515245 + 12345) >>> 0; // deterministic LCG step

    const startHour = OPEN_HOUR + (cursor % (CLOSE_HOUR - OPEN_HOUR));
    const court = COURTS[(cursor >>> 8) % COURTS.length];
    const slotKey = `${startHour}_${court}`;
    if (usedSlots.has(slotKey)) continue;
    usedSlots.add(slotKey);

    const customer = CUSTOMERS[(cursor >>> 12) % CUSTOMERS.length];
    const status = STATUSES[(cursor >>> 16) % STATUSES.length];

    reservations.push({
      id: `${dateId}_${startHour}_${court.replace(" ", "")}`,
      date: dateId,
      startHour,
      court,
      customerName: customer.name,
      customerPhone: customer.phone,
      status,
    });
  }

  return reservations.sort((a, b) => a.startHour - b.startHour);
}

// Bookings made through the call-center availability search (BookingSearchModal).
// Held in memory alongside the generated ones so a freshly booked slot shows up
// immediately and is treated as occupied by later searches; resets on reload.
const manualBookings: Reservation[] = [];
let manualBookingCounter = 0;

export function addManualBooking(input: {
  date: string; // YYYY-MM-DD
  startHour: number;
  durationMinutes: number;
  court: string;
  customerName: string;
  customerPhone: string;
}): Reservation {
  const reservation: Reservation = {
    id: `manual_${input.date}_${input.startHour}_${input.court.replace(/\s+/g, "")}_${++manualBookingCounter}`,
    date: input.date,
    startHour: input.startHour,
    durationMinutes: input.durationMinutes,
    court: input.court,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    status: "confirmed",
  };
  manualBookings.push(reservation);
  return reservation;
}

export function mockReservationsForDay(date: Date): Reservation[] {
  const dateId = toDateId(date);
  const generated = mockReservationsForDate(dateId);
  const manual = manualBookings.filter((b) => b.date === dateId);
  return [...generated, ...manual].sort((a, b) => a.startHour - b.startHour);
}
