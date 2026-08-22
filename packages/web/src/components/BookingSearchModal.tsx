import { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { searchAvailability, createBooking, type SearchSlot, type SearchLongTermOpportunity } from "../api/bookings.api";
import { getErrorMessage } from "../api/auth.api";
import type { ApiCourt } from "../api/courts.api";
import { WeekdayPicker } from "./WeekdayPicker";
import { isValidPhone, normalizePhone } from "../lib/phone";

interface BookingSearchModalProps {
  open: boolean;
  onClose: () => void;
  courts: ApiCourt[];
  onBooked: () => void;
}

const DURATIONS = [30, 60, 90, 120, 150, 180];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type Step = "search" | "confirm" | "done";
type BookingTarget = { kind: "single"; slot: SearchSlot } | { kind: "long-term"; opportunity: SearchLongTermOpportunity };

export function BookingSearchModal({ open, onClose, courts, onBooked }: BookingSearchModalProps) {
  const { t } = useTranslation();
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [courtType, setCourtType] = useState<Set<"covered" | "uncovered">>(new Set());
  const [courtId, setCourtId] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SearchSlot[]>([]);
  const [longTerm, setLongTerm] = useState<SearchLongTermOpportunity | null>(null);

  const [step, setStep] = useState<Step>("search");
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookedSummary, setBookedSummary] = useState<string | null>(null);

  if (!open) return null;

  function resetAndClose() {
    setStep("search");
    setTarget(null);
    setCustomerName("");
    setCustomerPhone("");
    setBookedSummary(null);
    setBookError(null);
    setHasSearched(false);
    setSlots([]);
    setLongTerm(null);
    onClose();
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleCourtType(type: "covered" | "uncovered") {
    setCourtType((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function handleSearch() {
    const effectiveType = courtType.size === 1 ? (courtType.values().next().value as "covered" | "uncovered") : "any";
    setSearching(true);
    setSearchError(null);
    try {
      const result = await searchAvailability({
        daysOfWeek,
        startTime,
        durationMinutes,
        courtType: effectiveType,
        courtId: courtId ?? undefined,
      });
      setSlots(result.slots);
      setLongTerm(result.longTerm);
      setHasSearched(true);
    } catch (err) {
      setSearchError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function startBooking(t: BookingTarget) {
    setTarget(t);
    setBookError(null);
    setStep("confirm");
  }

  async function confirmBooking() {
    if (!target || !customerName.trim() || !customerPhone.trim()) return;
    if (!isValidPhone(customerPhone)) {
      setBookError(t("bookingSearch.invalidPhone"));
      return;
    }

    const phone = normalizePhone(customerPhone);
    setBooking(true);
    setBookError(null);
    try {
      if (target.kind === "single") {
        const { slot } = target;
        await createBooking({
          courtId: slot.courtId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          customerName: customerName.trim(),
          customerPhone: phone,
        });
        setBookedSummary(
          t("bookingSearch.bookedSingle", {
            court: slot.courtName,
            name: customerName.trim(),
            date: dayjs(slot.date).format("DD MMM"),
            time: slot.startTime,
          })
        );
      } else {
        const { opportunity } = target;
        const results = await Promise.allSettled(
          opportunity.dates.map((date) =>
            createBooking({
              courtId: opportunity.courtId,
              date,
              startTime: opportunity.startTime,
              endTime: opportunity.endTime,
              customerName: customerName.trim(),
              customerPhone: phone,
            })
          )
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.length - succeeded;
        setBookedSummary(
          failed === 0
            ? t("bookingSearch.bookedLongTermAll", {
                court: opportunity.courtName,
                name: customerName.trim(),
                weekday: dayjs().day(opportunity.weekday).format("dddd"),
                weeks: succeeded,
              })
            : t("bookingSearch.bookedLongTermPartial", {
                succeeded,
                total: results.length,
                name: customerName.trim(),
                failed,
              })
        );
      }
      setStep("done");
      onBooked();
    } catch (err) {
      setBookError(getErrorMessage(err));
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {step === "done" ? t("bookingSearch.titleDone") : step === "search" ? t("bookingSearch.titleSearch") : t("bookingSearch.titleConfirm")}
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label={t("common.close")}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {step === "search" && (
          <div className="space-y-5 px-6 py-5">
            <div>
              <span className="block text-sm font-medium text-slate-700">{t("bookingSearch.daysOfWeek")}</span>
              <div className="mt-2">
                <WeekdayPicker selected={daysOfWeek} onToggle={toggleDay} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{t("bookingSearch.daysHint")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">
                  {t("bookingSearch.startTime")}
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-slate-700">
                  {t("bookingSearch.duration")}
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
              <span className="block text-sm font-medium text-slate-700">{t("bookingSearch.courtType")}</span>
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
                  {t("common.covered")}
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
                  {t("common.uncovered")}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t("bookingSearch.courtTypeHint")}</p>
            </div>

            <div>
              <label htmlFor="courtId" className="block text-sm font-medium text-slate-700">
                {t("bookingSearch.court")}
              </label>
              <select
                id="courtId"
                value={courtId ?? ""}
                onChange={(e) => setCourtId(e.target.value === "" ? null : e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{t("bookingSearch.anyCourt")}</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.covered ? t("common.covered").toLowerCase() : t("common.uncovered").toLowerCase()})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? t("common.searching") : t("common.search")}
            </button>

            {searchError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">{searchError}</p>
            )}

            {hasSearched && !searchError && (
              <div className="border-t border-slate-200 pt-4">
                {slots.length === 0 && !longTerm && (
                  <p className="text-sm text-slate-500">{t("bookingSearch.noAvailability")}</p>
                )}

                <ul className="space-y-2">
                  {longTerm && (
                    <li className="rounded-md border-2 border-emerald-500 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                            {t("bookingSearch.longTermBadge")}
                          </span>
                          <p className="mt-1.5 text-sm font-semibold text-slate-900">
                            {t("bookingSearch.longTermLine", {
                              court: longTerm.courtName,
                              weekday: dayjs().day(longTerm.weekday).format("dddd"),
                              start: longTerm.startTime,
                              end: longTerm.endTime,
                            })}
                          </p>
                          <p className="text-xs text-slate-600">
                            {t("bookingSearch.longTermFree", {
                              weeks: longTerm.dates.length,
                              from: dayjs(longTerm.dates[0]).format("DD MMM"),
                              to: dayjs(longTerm.dates[longTerm.dates.length - 1]).format("DD MMM"),
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startBooking({ kind: "long-term", opportunity: longTerm })}
                          className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          {t("bookingSearch.book")}
                        </button>
                      </div>
                    </li>
                  )}

                  {slots.map((slot) => (
                    <li
                      key={`${slot.date}_${slot.courtId}_${slot.startTime}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {dayjs(slot.date).format("dddd, DD MMM")} · {slot.startTime}–{slot.endTime}
                        </p>
                        <p className="text-xs text-slate-600">
                          {slot.courtName} ({slot.covered ? t("common.covered").toLowerCase() : t("common.uncovered").toLowerCase()})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startBooking({ kind: "single", slot })}
                        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600 hover:bg-emerald-50"
                      >
                        {t("bookingSearch.book")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && target && (
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {target.kind === "single" ? (
                <p>
                  {t("bookingSearch.confirmSingle", {
                    court: target.slot.courtName,
                    date: dayjs(target.slot.date).format("dddd, DD MMM"),
                    start: target.slot.startTime,
                    end: target.slot.endTime,
                  })}
                </p>
              ) : (
                <p>
                  {t("bookingSearch.confirmLongTerm", {
                    court: target.opportunity.courtName,
                    weekday: dayjs().day(target.opportunity.weekday).format("dddd"),
                    start: target.opportunity.startTime,
                    end: target.opportunity.endTime,
                    weeks: target.opportunity.dates.length,
                    date: dayjs(target.opportunity.dates[0]).format("DD MMM"),
                  })}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">
                {t("bookingSearch.customerName")}
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
                {t("bookingSearch.customerPhone")}
              </label>
              <input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {customerPhone.trim().length > 0 && !isValidPhone(customerPhone) && (
                <p className="mt-1 text-xs text-red-600">{t("bookingSearch.phoneHint")}</p>
              )}
            </div>

            {bookError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {t("bookingSearch.bookErrorPrefix", { error: bookError })}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("search")}
                disabled={booking}
                className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:opacity-60"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                disabled={!customerName.trim() || !isValidPhone(customerPhone) || booking}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {booking ? t("bookingSearch.booking") : t("bookingSearch.confirmBooking")}
              </button>
            </div>
          </div>
        )}

        {step === "done" && bookedSummary && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-emerald-700">{bookedSummary}</p>
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t("common.done")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
