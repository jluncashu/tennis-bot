// Mock in-memory store only — no settings table exists yet (see
// docs/app/db-schema.md). Resets on server restart. Shaped like a
// repository so swapping this for real Drizzle queries later doesn't
// require touching settings.service.ts or settings.controller.ts.

import type { CourtSettings } from "./settings.schema";

let currentSettings: CourtSettings = {
  openHour: 8,
  closeHour: 22,
  slotDurationMinutes: 60,
  courts: ["Teren 1", "Teren 2", "Teren 3"],
  pricePerSlotRON: 80,
};

export function getSettings(): CourtSettings {
  return currentSettings;
}

export function saveSettings(patch: Partial<CourtSettings>): CourtSettings {
  currentSettings = { ...currentSettings, ...patch };
  return currentSettings;
}
