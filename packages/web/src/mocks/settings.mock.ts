// Local mock store — no backend call involved. Mirrors the shape/defaults
// of packages/api/src/modules/settings/settings.repository.ts. A single
// module-level object, so edits from SettingsPage are visible to
// ReservationsPage on its next mount; resets on page reload.

export interface Court {
  name: string;
  covered: boolean;
}

export interface CourtSettings {
  openHour: number;
  closeHour: number;
  slotDurationMinutes: number;
  courts: Court[];
  pricePerSlotRON: number;
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
};

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
