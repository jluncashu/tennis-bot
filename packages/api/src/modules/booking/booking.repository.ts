// Mock data only — no courts/availability/reservations table exists yet
// (see docs/app/db-schema.md). Shaped like a repository so swapping these
// for real Drizzle queries later doesn't require touching booking.flow.ts
// or booking.service.ts.

export interface Option {
  id: string;
  title: string;
}

const FIELD_NAMES = ["Teren 1", "Teren 2", "Teren 3"];
const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;

export function mockDatesForWeek(weekOffset: number): Option[] {
  const today = new Date();
  const dates: Option[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7 + i);
    const id = toDateId(d);
    dates.push({ id, title: formatDateTitle(id) });
  }
  return dates;
}

export function mockSlotsForDate(dateId: string): Option[] {
  const seed = hashString(dateId);
  const slots: Option[] = [];
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
    // Deterministic "already booked" slots so the mock looks realistic
    // without needing real reservation data.
    if ((seed + hour) % 5 === 0) continue;
    const id = `${dateId}_${hour}`;
    slots.push({ id, title: formatSlotTitle(id) });
  }
  return slots;
}

export function mockFieldsForSlot(slotId: string): Option[] {
  const seed = hashString(slotId);
  return FIELD_NAMES.map((_, i) => `${slotId}_field${i + 1}`)
    .filter((_, i) => (seed + i) % 4 !== 0) // one field "already taken" sometimes
    .map((id) => ({ id, title: formatFieldTitle(id) }));
}

// Titles are always derived from the id rather than threaded through the
// WhatsApp Flow client, since a RadioButtonsGroup only reports back the
// selected id, not its title.

export function formatDateTitle(dateId: string): string {
  const d = new Date(`${dateId}T00:00:00`);
  const label = d.toLocaleDateString("ro-RO", { weekday: "long", day: "2-digit", month: "2-digit" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatSlotTitle(slotId: string): string {
  const hour = Number(slotId.split("_")[1]);
  return `${pad(hour)}:00 - ${pad(hour + 1)}:00`;
}

export function formatFieldTitle(fieldId: string): string {
  const index = Number(fieldId.split("field")[1]) - 1;
  return FIELD_NAMES[index] ?? fieldId;
}

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
