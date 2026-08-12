import { useMemo, useState } from "react";
import { addPriceRange, updatePriceRange, type CourtSettings, type PriceRange } from "../mocks/settings.mock";
import { WeekdayPicker } from "./WeekdayPicker";

interface PriceRangeModalProps {
  open: boolean;
  onClose: () => void;
  settings: CourtSettings;
  editing: PriceRange | null; // null = creating a new range
  onSaved: () => void;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function PriceRangeModal({ open, onClose, settings, editing, onSaved }: PriceRangeModalProps) {
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(editing?.daysOfWeek ?? []);
  const [startHour, setStartHour] = useState(editing?.startHour ?? settings.openHour);
  const [endHour, setEndHour] = useState(editing?.endHour ?? settings.closeHour);
  const [price, setPrice] = useState(editing?.pricePerSlotRON ?? settings.pricePerSlotRON);
  const [error, setError] = useState<string | null>(null);

  const hourOptions = useMemo(() => {
    const options: number[] = [];
    for (let h = settings.openHour; h <= settings.closeHour; h++) options.push(h);
    return options;
  }, [settings.openHour, settings.closeHour]);

  if (!open) return null;

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handleSave() {
    if (daysOfWeek.length === 0) {
      setError("Select at least one day.");
      return;
    }
    if (startHour >= endHour) {
      setError("Start time must be before end time.");
      return;
    }
    if (price < 0) {
      setError("Price must be zero or more.");
      return;
    }

    const range = { daysOfWeek, startHour, endHour, pricePerSlotRON: price };
    if (editing) updatePriceRange(editing.id, range);
    else addPriceRange(range);

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit price range" : "Add price range"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="block text-sm font-medium text-slate-700">Days of the week</span>
            <div className="mt-2">
              <WeekdayPicker selected={daysOfWeek} onToggle={toggleDay} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rangeStart" className="block text-sm font-medium text-slate-700">
                From
              </label>
              <select
                id="rangeStart"
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rangeEnd" className="block text-sm font-medium text-slate-700">
                To
              </label>
              <select
                id="rangeEnd"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rangePrice" className="block text-sm font-medium text-slate-700">
              Price per slot (RON)
            </label>
            <input
              id="rangePrice"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
