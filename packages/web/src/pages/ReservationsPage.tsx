import { useEffect, useMemo, useState } from "react";
import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { apiGet } from "../lib/api";

// en-gb: Monday-first weeks (matches the backend's Mon-Sun
// mockReservationsForWeek) and 24-hour time formats.
dayjs.locale("en-gb");

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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  status: ReservationStatus;
}

interface CourtResource {
  resourceId: string;
  resourceTitle: string;
}

const STATUS_COLORS: Record<ReservationStatus, string> = {
  confirmed: "#059669", // emerald-600
  pending: "#d97706", // amber-600
  cancelled: "#dc2626", // red-600
};

const localizer = dayjsLocalizer(dayjs);

const calendarFormats = {
  dayFormat: (date: Date) => dayjs(date).format("ddd DD/MM"),
  timeGutterFormat: (date: Date) => dayjs(date).format("HH:mm"),
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${dayjs(start).format("HH:mm")} – ${dayjs(end).format("HH:mm")}`,
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// A real Monday-Sunday calendar week, matching the backend's
// mockReservationsForWeek (reservations.repository.ts) so the fetched
// data always lines up with what react-big-calendar's Week view renders.
function mondayOfWeek(offset: number): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset * 7);
}

function EventContent({ event }: { event: CalendarEvent }) {
  return (
    <div className="truncate text-xs">
      <span className="font-semibold">{event.title}</span>
      <span className="opacity-90"> · {event.status}</span>
    </div>
  );
}

export function ReservationsPage() {
  const [settings, setSettings] = useState<CourtSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [reservationsError, setReservationsError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CourtSettings>("/api/settings")
      .then(setSettings)
      .catch((err) => setSettingsError(err.message));
  }, []);

  useEffect(() => {
    setReservations(null);
    apiGet<{ reservations: Reservation[] }>(`/api/reservations?weekOffset=${weekOffset}`)
      .then((data) => setReservations(data.reservations))
      .catch((err) => setReservationsError(err.message));
  }, [weekOffset]);

  const resources = useMemo<CourtResource[]>(
    () => (settings ? settings.courts.map((court) => ({ resourceId: court, resourceTitle: court })) : []),
    [settings]
  );

  const events = useMemo<CalendarEvent[]>(() => {
    if (!reservations || !settings) return [];
    return reservations.map((r) => {
      const start = new Date(`${r.date}T${pad(r.startHour)}:00:00`);
      const end = new Date(start.getTime() + settings.slotDurationMinutes * 60_000);
      return { id: r.id, title: r.customerName, start, end, resourceId: r.court, status: r.status };
    });
  }, [reservations, settings]);

  const error = settingsError ?? reservationsError;
  const loading = !error && (!settings || reservations === null);
  const weekStart = mondayOfWeek(weekOffset);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>
      <p className="mt-1 text-sm text-slate-500">All courts, one week at a glance (mock data).</p>

      {error && <p className="mt-6 text-sm text-red-600">Failed to load: {error}</p>}

      {!error && loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

      {!error && settings && reservations !== null && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {dayjs(weekStart).format("DD MMM")} – {dayjs(weekStart).add(6, "day").format("DD MMM YYYY")}
            </h2>
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
            <Calendar
              localizer={localizer}
              date={weekStart}
              onNavigate={() => {}}
              defaultView={Views.WEEK}
              views={[Views.WEEK]}
              toolbar={false}
              resources={resources}
              resourceIdAccessor="resourceId"
              resourceTitleAccessor="resourceTitle"
              resourceGroupingLayout
              events={events}
              min={new Date(1970, 0, 1, settings.openHour, 0)}
              max={new Date(1970, 0, 1, settings.closeHour, 0)}
              step={settings.slotDurationMinutes}
              timeslots={1}
              formats={calendarFormats}
              eventPropGetter={(event) => ({
                style: { backgroundColor: STATUS_COLORS[(event as CalendarEvent).status], color: "#fff" },
              })}
              components={{ event: EventContent }}
              style={{ height: 700 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
