import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type { Reservation } from "../types/reservation";
import { addDays, startOfDay, startOfWeek, toDateId } from "../lib/date";
import { BookingSearchModal } from "../components/BookingSearchModal";
import { ReservationDetailsModal } from "../components/ReservationDetailsModal";
import { WeekCalendarGrid } from "../components/WeekCalendarGrid";
import { QuickAddPopover } from "../components/QuickAddPopover";
import { listBookings, subscribeToBookingEvents, exportBookings, type ApiBooking } from "../api/bookings.api";
import { listCourts, type ApiCourtWithRules } from "../api/courts.api";
import { getErrorMessage } from "../api/auth.api";
import { useCalendarStore } from "../store/calendar.store";
import { useAuthStore } from "../store/auth.store";
import { buildCourtColorMap } from "../lib/courtColors";

const FALLBACK_OPEN_HOUR = 8;
const FALLBACK_CLOSE_HOUR = 22;
const FALLBACK_SLOT_DURATION = 60;

type ViewMode = "day" | "week";

function apiBookingToReservation(b: ApiBooking): Reservation {
  const [startH, startM] = b.startTime.split(":").map(Number);
  const [endH, endM] = b.endTime.split(":").map(Number);
  return {
    id: b.id,
    date: b.date,
    startHour: startH + startM / 60,
    durationMinutes: endH * 60 + endM - (startH * 60 + startM),
    court: b.courtName,
    customerName: b.customerName ?? b.customerPhone,
    customerPhone: b.customerPhone,
    status: b.status,
  };
}

function formatRangeLabel(days: Date[]): string {
  if (days.length === 1) return dayjs(days[0]).format("dddd, D MMMM YYYY");
  const start = dayjs(days[0]);
  const end = dayjs(days[days.length - 1]);
  if (start.isSame(end, "month")) return start.format("MMMM YYYY");
  if (start.isSame(end, "year")) return `${start.format("MMM D")} – ${end.format("MMM D, YYYY")}`;
  return `${start.format("MMM D, YYYY")} – ${end.format("MMM D, YYYY")}`;
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  );
}

export function ReservationsPage() {
  const { t } = useTranslation();
  const club = useAuthStore((s) => s.club);
  const [courts, setCourts] = useState<ApiCourtWithRules[]>([]);
  const [courtsLoaded, setCourtsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [rangeStart, setRangeStart] = useState(() => startOfDay(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingModalKey, setBookingModalKey] = useState(0);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  const [popover, setPopover] = useState<{
    date: Date;
    minuteOfDay: number;
    clientX: number;
    clientY: number;
    court?: string;
  } | null>(null);

  const days = viewMode === "week" ? Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)) : [rangeStart];

  async function refreshRange() {
    try {
      const from = toDateId(days[0]);
      const to = toDateId(days[days.length - 1]);
      const bookings = await listBookings(from, to);
      setReservations(bookings.map(apiBookingToReservation));
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  }

  function setMode(mode: ViewMode) {
    if (mode === viewMode) return; // no-op click on the already-active mode
    setViewMode(mode);
    setRangeStart((d) => {
      if (mode === "week") return startOfWeek(d);
      // Switching to Day: land on today if it's within the week just shown,
      // otherwise fall back to that week's first day (no specific day was selected).
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(d);
      const withinWeek = today.getTime() >= weekStart.getTime() && today.getTime() < addDays(weekStart, 7).getTime();
      return withinWeek ? today : weekStart;
    });
  }

  function goToday() {
    setRangeStart(viewMode === "week" ? startOfWeek(new Date()) : startOfDay(new Date()));
  }

  function goStep(direction: 1 | -1) {
    setRangeStart((d) => addDays(d, (viewMode === "week" ? 7 : 1) * direction));
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportBookings(toDateId(rangeStart));
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    listCourts()
      .then(setCourts)
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setCourtsLoaded(true));
  }, []);

  useEffect(() => {
    refreshRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, viewMode]);

  // Always call the latest refreshRange (which closes over the current date
  // range) without reopening the SSE connection every time that range changes.
  const refreshRangeRef = useRef(refreshRange);
  refreshRangeRef.current = refreshRange;

  useEffect(() => {
    return subscribeToBookingEvents(() => refreshRangeRef.current());
  }, []);

  const focusDate = useCalendarStore((s) => s.focusDate);
  useEffect(() => {
    if (!focusDate) return;
    setRangeStart(viewMode === "week" ? startOfWeek(focusDate) : startOfDay(focusDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate]);

  const isCurrent =
    viewMode === "week"
      ? rangeStart.getTime() === startOfWeek(new Date()).getTime()
      : rangeStart.getTime() === startOfDay(new Date()).getTime();
  const selectedReservation = reservations.find((r) => r.id === selectedReservationId) ?? null;
  const filteredReservations =
    courtFilter === "all" ? reservations : reservations.filter((r) => r.court === courtFilter);
  // Used for both views: per-court columns in Day view, and the occupancy
  // segments + legend in Week view (see WeekCalendarGrid).
  const visibleCourts = courts.filter((c) => courtFilter === "all" || c.name === courtFilter);
  // Built from the full, unfiltered court list so colors stay stable across
  // day/week view and the court filter, instead of shifting per-view subsets.
  const courtColors = useMemo(() => buildCourtColorMap(courts.map((c) => c.name)), [courts]);

  // Derives the calendar's visible hour range and row granularity from real
  // per-court availability_rules for whichever weekday(s) are on screen,
  // instead of a single hardcoded club-wide range — mirrors the same
  // min-start/max-end/finest-duration logic used server-side for the Excel
  // grid export, so the two stay visually consistent.
  const { openHour, closeHour, slotDurationMinutes } = useMemo(() => {
    const defaultDuration = club?.defaultSlotDurationMinutes ?? FALLBACK_SLOT_DURATION;
    const dows = new Set(days.map((d) => d.getDay()));

    let earliestMin: number | null = null;
    let latestMin: number | null = null;
    const durations: number[] = [];

    for (const court of courts) {
      const rules = court.rules.filter((r) => dows.has(r.dayOfWeek));
      if (rules.length === 0) continue;
      durations.push(court.slotDurationMinutes ?? defaultDuration);
      for (const r of rules) {
        const [sh, sm] = r.startTime.split(":").map(Number);
        const [eh, em] = r.endTime.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        earliestMin = earliestMin === null ? startMin : Math.min(earliestMin, startMin);
        latestMin = latestMin === null ? endMin : Math.max(latestMin, endMin);
      }
    }

    const openHour = earliestMin !== null ? Math.floor(earliestMin / 60) : FALLBACK_OPEN_HOUR;
    const closeHourRaw = latestMin !== null ? Math.ceil(latestMin / 60) : FALLBACK_CLOSE_HOUR;
    return {
      openHour,
      closeHour: Math.max(closeHourRaw, openHour + 1),
      slotDurationMinutes: durations.length > 0 ? Math.min(...durations) : defaultDuration,
    };
  }, [days, courts, club]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{formatRangeLabel(days)}</h1>
          <button
            type="button"
            onClick={goToday}
            disabled={isCurrent}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("common.today")}
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goStep(-1)}
              aria-label={t("common.previous")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => goStep(1)}
              aria-label={t("common.next")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {courts.length > 0 && (
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="rounded-full border-0 bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="all">{t("reservations.allCourts")}</option>
              {courts.map((court) => (
                <option key={court.name} value={court.name}>
                  {court.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("day")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "day" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("reservations.day")}
            </button>
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("reservations.week")}
            </button>
            <button
              type="button"
              disabled
              title={t("reservations.monthTooltip")}
              className="cursor-not-allowed rounded-full px-4 py-1.5 text-sm font-medium text-slate-300"
            >
              {t("reservations.month")}
            </button>
          </div>

          {viewMode === "day" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              title={t("reservations.exportTooltip")}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon />
              {exporting ? t("reservations.exporting") : t("reservations.export")}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setBookingModalKey((k) => k + 1);
              setBookingModalOpen(true);
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {t("reservations.newBooking")}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mx-6 mb-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {t("reservations.loadErrorPrefix", { error: loadError })}
        </div>
      )}

      {exportError && (
        <div className="mx-6 mb-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {t("reservations.exportErrorPrefix", { error: exportError })}
        </div>
      )}

      <BookingSearchModal
        key={bookingModalKey}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        courts={courts}
        onBooked={refreshRange}
      />

      {selectedReservation && (
        <ReservationDetailsModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservationId(null)}
          onCancelled={() => {
            refreshRange();
            setSelectedReservationId(null);
          }}
        />
      )}

      {popover && (
        <QuickAddPopover
          date={popover.date}
          minuteOfDay={popover.minuteOfDay}
          clientX={popover.clientX}
          clientY={popover.clientY}
          courts={courts}
          courtColors={courtColors}
          initialCourt={popover.court}
          slotDurationMinutes={slotDurationMinutes}
          onClose={() => setPopover(null)}
          onBooked={refreshRange}
        />
      )}

      {courtsLoaded ? (
        <div className="min-h-0 flex-1">
          <WeekCalendarGrid
            days={days}
            reservations={filteredReservations}
            slotDurationMinutes={slotDurationMinutes}
            openHour={openHour}
            closeHour={closeHour}
            courts={visibleCourts}
            courtColors={courtColors}
            onSlotClick={(date, minuteOfDay, clientX, clientY, court) =>
              setPopover({ date, minuteOfDay, clientX, clientY, court })
            }
            onEventClick={(reservation) => setSelectedReservationId(reservation.id)}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500">{t("common.loading")}</p>
      )}
    </div>
  );
}
