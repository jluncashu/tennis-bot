import { getSettings as findSettings, saveSettings as persistSettings } from "./settings.repository";
import { httpError } from "../../shared/utils/http-error";
import type { CourtSettings, UpdateSettingsBody } from "./settings.schema";

export function getSettings(): CourtSettings {
  return findSettings();
}

export function updateSettings(patch: UpdateSettingsBody): CourtSettings {
  const current = findSettings();
  const openHour = patch.openHour ?? current.openHour;
  const closeHour = patch.closeHour ?? current.closeHour;
  if (openHour >= closeHour) {
    throw httpError(400, "openHour must be before closeHour");
  }
  return persistSettings(patch);
}
