import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import type { Reservation } from "../mocks/reservations.mock";
import { getSettings, type CourtSettings } from "../mocks/settings.mock";
import { addDays, startOfDay, startOfWeek, toDateId } from "../lib/date";
import { BookingSearchModal } from "../components/BookingSearchModal";
import { ReservationDetailsModal } from "../components/ReservationDetailsModal";
import { WeekCalendarGrid } from "../components/WeekCalendarGrid";
import { QuickAddPopover } from "../components/QuickAddPopover";
import { listBookings, subscribeToBookingEvents, exportBookings, type ApiBooking } from "../api/bookings.api";
import { listCourts, type ApiCourt } from "../api/courts.api";
import { getErrorMessage } from "../api/auth.api";
import { useCalendarStore } from "../store/calendar.store";
import { buildCourtColorMap } from "../lib/courtColors";

dayjs.locale("en-gb");

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
  const [settings, setSettings] = useState<CourtSettings | null>(null);
  const [courts, setCourts] = useState<ApiCourt[]>([]);
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
      const bookings = await listBookings();
      const dateIds = new Set(days.map((d) => toDateId(d)));
      setReservations(bookings.filter((b) => dateIds.has(b.date)).map(apiBookingToReservation));
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
    setSettings(getSettings());
    listCourts()
      .then(setCourts)
      .catch((err) => setLoadError(getErrorMessage(err)));
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
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goStep(-1)}
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => goStep(1)}
              aria-label="Next"
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
              <option value="all">All courts</option>
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
              Day
            </button>
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              disabled
              title="Month view isn't built yet"
              className="cursor-not-allowed rounded-full px-4 py-1.5 text-sm font-medium text-slate-300"
            >
              Month
            </button>
          </div>

          {viewMode === "day" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              title="Export this day's bookings to Excel"
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon />
              {exporting ? "Exporting…" : "Export"}
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
            New booking
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mx-6 mb-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          Couldn't load reservations: {loadError}
        </div>
      )}

      {exportError && (
        <div className="mx-6 mb-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          Couldn't export: {exportError}
        </div>
      )}

      {settings && (
        <BookingSearchModal
          key={bookingModalKey}
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          settings={{ ...settings, courts }}
          onBooked={refreshRange}
          quickBook={null}
        />
      )}

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

      {popover && settings && (
        <QuickAddPopover
          date={popover.date}
          minuteOfDay={popover.minuteOfDay}
          clientX={popover.clientX}
          clientY={popover.clientY}
          courts={courts}
          courtColors={courtColors}
          initialCourt={popover.court}
          slotDurationMinutes={settings.slotDurationMinutes}
          onClose={() => setPopover(null)}
          onBooked={refreshRange}
        />
      )}

      {settings ? (
        <div className="min-h-0 flex-1">
          <WeekCalendarGrid
            days={days}
            reservations={filteredReservations}
            slotDurationMinutes={settings.slotDurationMinutes}
            openHour={settings.openHour}
            closeHour={settings.closeHour}
            courts={visibleCourts}
            courtColors={courtColors}
            onSlotClick={(date, minuteOfDay, clientX, clientY, court) =>
              setPopover({ date, minuteOfDay, clientX, clientY, court })
            }
            onEventClick={(reservation) => setSelectedReservationId(reservation.id)}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Loading…</p>
      )}
    </div>
  );
}
