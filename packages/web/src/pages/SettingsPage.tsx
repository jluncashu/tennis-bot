import { FormEvent, useEffect, useState } from "react";
// import { apiGet, apiPut } from "../lib/api"; // old: fetched/saved mock data through the backend
import { getSettings, saveSettings, type Court, type CourtSettings } from "../mocks/settings.mock";

// interface CourtSettings {
//   openHour: number;
//   closeHour: number;
//   slotDurationMinutes: number;
//   courts: string[];
//   pricePerSlotRON: number;
// }

const SLOT_DURATIONS = [30, 60, 90, 120];

let nextNewCourtNum = 1;

export function SettingsPage() {
  const [settings, setSettings] = useState<CourtSettings | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  // setLoadError: unused now that the old apiGet().catch() below is commented out.
  const [loadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Old: fetched/saved mock data through the backend.
  // useEffect(() => {
  //   apiGet<CourtSettings>("/api/settings")
  //     .then((data) => {
  //       setSettings(data);
  //       setCourts(data.courts);
  //     })
  //     .catch((err) => setLoadError(err.message));
  // }, []);
  //
  // async function handleSubmit(e: FormEvent) {
  //   e.preventDefault();
  //   if (!settings) return;
  //
  //   setSaveState("saving");
  //   setSaveError(null);
  //   try {
  //     const updated = await apiPut<CourtSettings>("/api/settings", { ...settings, courts });
  //     setSettings(updated);
  //     setCourts(updated.courts);
  //     setSaveState("saved");
  //   } catch (err) {
  //     setSaveState("error");
  //     setSaveError(err instanceof Error ? err.message : "Failed to save settings.");
  //   }
  // }

  // New: mock data handled locally in the frontend, no backend call.
  useEffect(() => {
    const data = getSettings();
    setSettings(data);
    setCourts(data.courts);
  }, []);

  function updateCourt(index: number, patch: Partial<Court>) {
    setCourts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeCourt(index: number) {
    setCourts((prev) => prev.filter((_, i) => i !== index));
  }

  function addCourt() {
    setCourts((prev) => [...prev, { name: `Teren ${prev.length + nextNewCourtNum++}`, covered: false }]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    const cleanedCourts = courts
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name.length > 0);

    setSaveState("saving");
    setSaveError(null);
    try {
      const updated = saveSettings({ ...settings, courts: cleanedCourts });
      setSettings(updated);
      setCourts(updated.courts);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save settings.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Court and business hours (mock, resets on server restart).</p>

      {loadError && <p className="mt-6 text-sm text-red-600">Failed to load settings: {loadError}</p>}

      {!loadError && settings === null && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

      {settings && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="openHour" className="block text-sm font-medium text-slate-700">
                Opens at
              </label>
              <input
                id="openHour"
                type="number"
                min={0}
                max={24}
                value={settings.openHour}
                onChange={(e) => setSettings({ ...settings, openHour: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="closeHour" className="block text-sm font-medium text-slate-700">
                Closes at
              </label>
              <input
                id="closeHour"
                type="number"
                min={0}
                max={24}
                value={settings.closeHour}
                onChange={(e) => setSettings({ ...settings, closeHour: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="slotDuration" className="block text-sm font-medium text-slate-700">
              Slot duration
            </label>
            <select
              id="slotDuration"
              value={settings.slotDurationMinutes}
              onChange={(e) => setSettings({ ...settings, slotDurationMinutes: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SLOT_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Courts</span>
            <div className="mt-1 space-y-2">
              {courts.map((court, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={court.name}
                    onChange={(e) => updateCourt(i, { name: e.target.value })}
                    placeholder="Court name"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <label className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={court.covered}
                      onChange={(e) => updateCourt(i, { covered: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Covered
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCourt(i)}
                    aria-label="Remove court"
                    className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCourt}
              className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              + Add court
            </button>
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-slate-700">
              Price per slot (RON)
            </label>
            <input
              id="price"
              type="number"
              min={0}
              value={settings.pricePerSlotRON}
              onChange={(e) => setSettings({ ...settings, pricePerSlotRON: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {saveState === "error" && <p className="text-sm text-red-600">{saveError}</p>}
          {saveState === "saved" && <p className="text-sm text-emerald-600">Settings saved.</p>}

          <button
            type="submit"
            disabled={saveState === "saving"}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saveState === "saving" ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
