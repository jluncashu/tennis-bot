// Local mock store — no backend call involved. Mirrors the shape/defaults
// of packages/api/src/modules/settings/settings.repository.ts. A single
// module-level object, so edits from SettingsPage are visible to
// ReservationsPage on its next mount; resets on page reload.

export interface Court {
  name: string;
  covered: boolean;
}

export interface PriceRange {
  id: string;
  daysOfWeek: number[]; // 0=Sun..6=Sat, matches WeekdayPicker
  startHour: number;
  endHour: number;
  pricePerSlotRON: number;
}

export interface CourtSettings {
  openHour: number;
  closeHour: number;
  slotDurationMinutes: number;
  courts: Court[];
  pricePerSlotRON: number; // default/base price, used where no range below applies
  priceRanges: PriceRange[];
}

let currentSettings: CourtSettings = {
  openHour: 8,
  closeHour: 22,
  slotDurationMinutes: 60,
  courts: [
    { name: "Teren 1", covered: true },
    { name: "Teren 2", covered: false },
    { name: "Teren 3", covered: false },
  ],
  pricePerSlotRON: 80,
  priceRanges: [],
};

let priceRangeCounter = 0;

export function addPriceRange(range: Omit<PriceRange, "id">): PriceRange {
  const newRange: PriceRange = { ...range, id: `price_${++priceRangeCounter}` };
  currentSettings = { ...currentSettings, priceRanges: [...currentSettings.priceRanges, newRange] };
  return newRange;
}

export function updatePriceRange(id: string, patch: Omit<PriceRange, "id">): void {
  currentSettings = {
    ...currentSettings,
    priceRanges: currentSettings.priceRanges.map((r) => (r.id === id ? { ...patch, id } : r)),
  };
}

export function removePriceRange(id: string): void {
  currentSettings = {
    ...currentSettings,
    priceRanges: currentSettings.priceRanges.filter((r) => r.id !== id),
  };
}

export function getSettings(): CourtSettings {
  return currentSettings;
}

export function saveSettings(patch: Partial<CourtSettings>): CourtSettings {
  const next = { ...currentSettings, ...patch };
  if (next.openHour >= next.closeHour) {
    throw new Error("openHour must be before closeHour");
  }
  currentSettings = next;
  return currentSettings;
}
