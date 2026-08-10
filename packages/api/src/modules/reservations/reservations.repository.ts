// Mock data only — no reservations table exists yet (see docs/app/db-schema.md).
// Shaped like a repository so swapping this for real Drizzle queries later
// doesn't require touching reservations.service.ts or reservations.controller.ts.

import type { Reservation, ReservationStatus } from "./reservations.schema";

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

function toDateId(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

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

function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

// Real Monday-Sunday calendar weeks (unlike booking.repository.ts's
// "today + weekOffset*7" rolling window) so the dashboard's week grid
// lines up with react-big-calendar's native Week view, which always
// renders a Mon-Sun range for whatever date it's given.
function mockReservationsForWeek(weekOffset: number): Reservation[] {
  const monday = mondayOf(new Date());
  const weekStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + weekOffset * 7);
  const all: Reservation[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    all.push(...mockReservationsForDate(toDateId(d)));
  }
  return all;
}

export function mockReservations(dateFilter?: string, weekOffset = 0): Reservation[] {
  if (dateFilter) {
    return mockReservationsForDate(dateFilter);
  }
  return mockReservationsForWeek(weekOffset);
}
