import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import type { EventContentArg, EventInput } from "@fullcalendar/core";
import { apiGet } from "../lib/api";
import { CourtPicker } from "../components/CourtPicker";

type ReservationStatus = "confirmed" | "pending" | "cancelled";

interface Reservation {
  id: string;
  date: string;
  startHour: number;
  court: string;
  customerName: string;
  customerPhone: string;
  status: ReservationStatus;
}

interface CourtSettings {
  openHour: number;
  closeHour: number;
  slotDurationMinutes: number;
  courts: string[];
  pricePerSlotRON: number;
}

const STATUS_COLORS: Record<ReservationStatus, { background: string; border: string }> = {
  confirmed: { background: "#059669", border: "#047857" },
  pending: { background: "#d97706", border: "#b45309" },
  cancelled: { background: "#dc2626", border: "#b91c1c" },
};

// Same "today + weekOffset*7" rolling-window start used by the backend's
// mockReservationsForWeek, so the calendar's visible range always matches
// what was actually fetched.
function startDateForWeekOffset(offset: number): string {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// FullCalendar duration strings are "HH:MM:SS" — minutes must be < 60, so
// a 90/120-minute slot has to be expressed as extra hours, not "00:90:00".
function minutesToDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad(hours)}:${pad(minutes)}:00`;
}

function renderEventContent(arg: EventContentArg) {
  const status = arg.event.extendedProps.status as ReservationStatus;
  return (
    <div className="truncate px-1 py-0.5 text-xs">
      <span className="font-semibold">{arg.event.title}</span>
      <span className="opacity-90"> · {status}</span>
    </div>
  );
}

const CUSTOM_VIEWS = {
  rollingWeek: {
    type: "timeGrid",
    duration: { days: 7 },
  },
};

export function ReservationsPage() {
  const [settings, setSettings] = useState<CourtSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [activeCourt, setActiveCourt] = useState<string | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [reservationsError, setReservationsError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CourtSettings>("/api/settings")
      .then((data) => {
        setSettings(data);
        setActiveCourt((current) => current ?? data.courts[0] ?? null);
      })
      .catch((err) => setSettingsError(err.message));
  }, []);

  useEffect(() => {
    setReservations(null);
    apiGet<{ reservations: Reservation[] }>(`/api/reservations?weekOffset=${weekOffset}`)
      .then((data) => setReservations(data.reservations))
      .catch((err) => setReservationsError(err.message));
  }, [weekOffset]);

  const events = useMemo<EventInput[]>(() => {
    if (!reservations || !activeCourt || !settings) return [];
    return reservations
      .filter((r) => r.court === activeCourt)
      .map((r) => {
        const start = new Date(`${r.date}T${pad(r.startHour)}:00:00`);
        const end = new Date(start.getTime() + settings.slotDurationMinutes * 60_000);
        const colors = STATUS_COLORS[r.status];
        return {
          id: r.id,
          title: r.customerName,
          start,
          end,
          backgroundColor: colors.background,
          borderColor: colors.border,
          textColor: "#ffffff",
          extendedProps: { status: r.status, customerPhone: r.customerPhone },
        };
      });
  }, [reservations, activeCourt, settings]);

  const error = settingsError ?? reservationsError;
  const loading = !error && (!settings || !activeCourt || reservations === null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>
      <p className="mt-1 text-sm text-slate-500">Pick a court to see its booking calendar (mock data).</p>

      {error && <p className="mt-6 text-sm text-red-600">Failed to load: {error}</p>}

      {!error && loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

      {!error && settings && activeCourt && reservations !== null && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
            <CourtPicker courts={settings.courts} active={activeCourt} onChange={setActiveCourt} />
            <div className="inline-flex overflow-hidden rounded-md ring-1 ring-inset ring-slate-300">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                aria-label="Previous week"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="border-x border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o + 1)}
                aria-label="Next week"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="p-4">
            <FullCalendar
              key={weekOffset}
              plugins={[timeGridPlugin]}
              initialView="rollingWeek"
              views={CUSTOM_VIEWS}
              initialDate={startDateForWeekOffset(weekOffset)}
              headerToolbar={{ left: "", center: "title", right: "" }}
              locale={enGbLocale}
              dayHeaderFormat={{ weekday: "short", day: "2-digit", month: "2-digit" }}
              slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              nowIndicator
              slotMinTime={`${pad(settings.openHour)}:00:00`}
              slotMaxTime={`${pad(settings.closeHour)}:00:00`}
              slotDuration={minutesToDuration(settings.slotDurationMinutes)}
              allDaySlot={false}
              height="auto"
              events={events}
              eventContent={renderEventContent}
            />
          </div>
        </div>
      )}
    </div>
  );
}
