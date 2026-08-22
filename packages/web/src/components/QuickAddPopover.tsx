import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import PhoneInputWithCountry, { isValidPhoneNumber } from "react-phone-number-input";
import { createBooking } from "../api/bookings.api";
import { getErrorMessage } from "../api/auth.api";
import type { ApiCourt } from "../api/courts.api";
import { courtColorFrom, type CourtColor } from "../lib/courtColors";

interface QuickAddPopoverProps {
  date: Date;
  minuteOfDay: number; // suggested start time, minutes since midnight
  clientX: number;
  clientY: number;
  courts: ApiCourt[];
  courtColors: Map<string, CourtColor>;
  initialCourt?: string;
  slotDurationMinutes: number;
  onClose: () => void;
  onBooked: () => void;
}

const POPOVER_WIDTH = 300;

function toHourMinute(minuteOfDay: number): { hour: number; minute: number } {
  return { hour: Math.floor(minuteOfDay / 60) % 24, minute: minuteOfDay % 60 };
}

function toTimeInputValue(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function QuickAddPopover({
  date,
  minuteOfDay,
  clientX,
  clientY,
  courts,
  courtColors,
  initialCourt,
  slotDurationMinutes,
  onClose,
  onBooked,
}: QuickAddPopoverProps) {
  const { t } = useTranslation();
  const start = toHourMinute(minuteOfDay);
  const end = toHourMinute(minuteOfDay + slotDurationMinutes);

  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [courtId, setCourtId] = useState(
    courts.find((c) => c.name === initialCourt)?.id ?? courts[0]?.id ?? ""
  );
  const [startTime, setStartTime] = useState(toTimeInputValue(start.hour, start.minute));
  const [endTime, setEndTime] = useState(toTimeInputValue(end.hour, end.minute));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const left = Math.min(clientX + 12, window.innerWidth - POPOVER_WIDTH - 12);
  const top = Math.min(clientY - 20, window.innerHeight - 420);

  async function handleSave() {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const durationMinutes = eh * 60 + em - (sh * 60 + sm);

    if (!title.trim()) return setError(t("quickAdd.nameRequired"));
    if (!phone) return setError(t("quickAdd.phoneRequired"));
    if (!isValidPhoneNumber(phone)) return setError(t("quickAdd.invalidPhone"));
    if (!courtId) return setError(t("quickAdd.courtRequired"));
    if (durationMinutes <= 0) return setError(t("quickAdd.endAfterStart"));

    setSaving(true);
    setError(null);
    try {
      await createBooking({
        courtId,
        date: dayjs(date).format("YYYY-MM-DD"),
        startTime,
        endTime,
        customerName: title.trim(),
        customerPhone: phone,
      });
      onBooked();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const selectedCourt = courts.find((c) => c.id === courtId);
  const dot = courtColorFrom(courtColors, selectedCourt?.name ?? "");

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left, top, width: POPOVER_WIDTH }}
      className="z-50 rounded-xl border border-slate-200 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("quickAdd.titlePlaceholder")}
          className="w-full border-none p-0 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="ml-2 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarIcon />
          {dayjs(date).format("dddd, DD MMM YYYY")}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <ClockIcon />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-slate-400">→</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CourtIcon />
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot.dot}`} />
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.covered ? t("common.covered").toLowerCase() : t("common.uncovered").toLowerCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <PhoneIcon />
          <PhoneInputWithCountry
            defaultCountry="RO"
            international
            value={phone}
            onChange={setPhone}
            placeholder={t("quickAdd.phonePlaceholder")}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-slate-400">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-slate-400">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CourtIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-slate-400">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-slate-400">
      <path d="M4 5c0 8.284 6.716 15 15 15l2-4-5-2-2 2c-2.5-1-4-2.5-5-5l2-2-2-5z" />
    </svg>
  );
}
