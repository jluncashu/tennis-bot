import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  searchAvailability,
  type AvailabilitySlot,
  type CourtTypeFilter,
  type LongTermOpportunity,
} from "../mocks/availability.mock";
import { addManualBooking } from "../mocks/reservations.mock";
import type { CourtSettings } from "../mocks/settings.mock";

interface BookingSearchModalProps {
  open: boolean;
  onClose: () => void;
  settings: CourtSettings;
  onBooked: () => void;
}

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const DURATIONS = [30, 60, 90, 120, 150, 180];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

type Step = "search" | "confirm";
type BookingTarget = { kind: "single"; slot: AvailabilitySlot } | { kind: "long-term"; opportunity: LongTermOpportunity };

export function BookingSearchModal({ open, onClose, settings, onBooked }: BookingSearchModalProps) {
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startHour, setStartHour] = useState(settings.openHour);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [courtType, setCourtType] = useState<Set<Exclude<CourtTypeFilter, "any">>>(new Set());
  const [courtName, setCourtName] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [longTerm, setLongTerm] = useState<LongTermOpportunity | null>(null);

  const [step, setStep] = useState<Step>("search");
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [booked, setBooked] = useState(false);

  const startHourOptions = useMemo(() => {
    const options: number[] = [];
    for (let h = settings.openHour; h + durationMinutes / 60 <= settings.closeHour; h++) {
      options.push(h);
    }
    return options;
  }, [settings.openHour, settings.closeHour, durationMinutes]);

  if (!open) return null;

  function resetAndClose() {
    setStep("search");
    setTarget(null);
    setCustomerName("");
    setCustomerPhone("");
    setBooked(false);
    setHasSearched(false);
    setSlots([]);
    setLongTerm(null);
    onClose();
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleCourtType(type: Exclude<CourtTypeFilter, "any">) {
    setCourtType((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleSearch() {
    const effectiveType: CourtTypeFilter =
      courtType.size === 1 ? (courtType.values().next().value as CourtTypeFilter) : "any";
    const result = searchAvailability(
      { daysOfWeek, startHour, durationMinutes, courtType: effectiveType, courtName },
      settings
    );
    setSlots(result.slots);
    setLongTerm(result.longTerm);
    setHasSearched(true);
  }

  function startBooking(t: BookingTarget) {
    setTarget(t);
    setStep("confirm");
  }

  function confirmBooking() {
    if (!target || !customerName.trim() || !customerPhone.trim()) return;

    if (target.kind === "single") {
      const { slot } = target;
      addManualBooking({
        date: slot.date,
        startHour: slot.startHour,
        durationMinutes: slot.durationMinutes,
        court: slot.court.name,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });
    } else {
      const { opportunity } = target;
      for (const date of opportunity.dates) {
        addManualBooking({
          date,
          startHour: opportunity.startHour,
          durationMinutes: opportunity.durationMinutes,
          court: opportunity.court.name,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        });
      }
    }

    setBooked(true);
    onBooked();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {step === "search" ? "Find a reservation" : booked ? "Booked" : "Confirm booking"}
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {step === "search" && (
          <div className="space-y-5 px-6 py-5">
            <div>
              <span className="block text-sm font-medium text-slate-700">Days of the week</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                      daysOfWeek.includes(d.value)
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">None selected searches every day.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startHour" className="block text-sm font-medium text-slate-700">
                  Start time
                </label>
                <select
                  id="startHour"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {startHourOptions.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-slate-700">
                  Duration
                </label>
                <select
                  id="duration"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {formatDuration(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700">Field type</span>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleCourtType("covered")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                    courtType.has("covered")
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Covered
                </button>
                <button
                  type="button"
                  onClick={() => toggleCourtType("uncovered")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                    courtType.has("uncovered")
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Uncovered
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">Neither selected searches both types.</p>
            </div>

            <div>
              <label htmlFor="courtName" className="block text-sm font-medium text-slate-700">
                Field number
              </label>
              <select
                id="courtName"
                value={courtName ?? ""}
                onChange={(e) => setCourtName(e.target.value === "" ? null : e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Any field</option>
                {settings.courts.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.covered ? "covered" : "uncovered"})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Search
            </button>

            {hasSearched && (
              <div className="border-t border-slate-200 pt-4">
                {slots.length === 0 && !longTerm && (
                  <p className="text-sm text-slate-500">No availability found for these filters.</p>
                )}

                <ul className="space-y-2">
                  {longTerm && (
                    <li className="rounded-md border-2 border-emerald-500 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                            Long-term opportunity
                          </span>
                          <p className="mt-1.5 text-sm font-semibold text-slate-900">
                            {longTerm.court.name} · every {dayjs().day(longTerm.weekday).format("dddd")},{" "}
                            {formatHour(longTerm.startHour)}–{formatHour(longTerm.startHour + longTerm.durationMinutes / 60)}
                          </p>
                          <p className="text-xs text-slate-600">
                            Free for the next {longTerm.dates.length} weeks ({dayjs(longTerm.dates[0]).format("DD MMM")} –{" "}
                            {dayjs(longTerm.dates[longTerm.dates.length - 1]).format("DD MMM")})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startBooking({ kind: "long-term", opportunity: longTerm })}
                          className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          Book
                        </button>
                      </div>
                    </li>
                  )}

                  {slots.map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {dayjs(slot.date).format("dddd, DD MMM")} · {formatHour(slot.startHour)}–
                          {formatHour(slot.startHour + slot.durationMinutes / 60)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {slot.court.name} ({slot.court.covered ? "covered" : "uncovered"})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startBooking({ kind: "single", slot })}
                        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600 hover:bg-emerald-50"
                      >
                        Book
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && target && !booked && (
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {target.kind === "single" ? (
                <p>
                  {target.slot.court.name} · {dayjs(target.slot.date).format("dddd, DD MMM")} ·{" "}
                  {formatHour(target.slot.startHour)}–{formatHour(target.slot.startHour + target.slot.durationMinutes / 60)}
                </p>
              ) : (
                <p>
                  {target.opportunity.court.name} · every {dayjs().day(target.opportunity.weekday).format("dddd")},{" "}
                  {formatHour(target.opportunity.startHour)}–
                  {formatHour(target.opportunity.startHour + target.opportunity.durationMinutes / 60)} ·{" "}
                  {target.opportunity.dates.length} weeks starting{" "}
                  {dayjs(target.opportunity.dates[0]).format("DD MMM")}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">
                Customer name
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium text-slate-700">
                Customer phone
              </label>
              <input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("search")}
                className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                disabled={!customerName.trim() || !customerPhone.trim()}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm booking
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && target && booked && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-emerald-700">
              {target.kind === "single"
                ? `Booked ${target.slot.court.name} for ${customerName} on ${dayjs(target.slot.date).format("DD MMM")} at ${formatHour(target.slot.startHour)}.`
                : `Booked ${target.opportunity.court.name} for ${customerName}, every ${dayjs().day(target.opportunity.weekday).format("dddd")} for ${target.opportunity.dates.length} weeks.`}
            </p>
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
