import { useEffect, useMemo, useState } from "react";
import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import "react-big-calendar/lib/css/react-big-calendar.css";
// import { apiGet } from "../lib/api"; // old: fetched mock data from the backend
import { mockReservationsForDay, type Reservation, type ReservationStatus } from "../mocks/reservations.mock";
import { getSettings, type CourtSettings } from "../mocks/settings.mock";
import { addDays, fromDateId, pad, startOfDay, toDateId } from "../lib/date";
import { BookingSearchModal } from "../components/BookingSearchModal";

// en-gb: 24-hour time formats.
dayjs.locale("en-gb");

// type ReservationStatus = "confirmed" | "pending" | "cancelled";
//
// interface Reservation {
//   id: string;
//   date: string;
//   startHour: number;
//   court: string;
//   customerName: string;
//   customerPhone: string;
//   status: ReservationStatus;
// }
//
// interface CourtSettings {
//   openHour: number;
//   closeHour: number;
//   slotDurationMinutes: number;
//   courts: string[];
//   pricePerSlotRON: number;
// }

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
  // setSettingsError: unused now that the old apiGet().catch() below is commented out.
  const [settingsError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  // setReservationsError: unused now that the old apiGet().catch() below is commented out.
  const [reservationsError] = useState<string | null>(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Old: fetched mock data from the backend.
  // useEffect(() => {
  //   apiGet<CourtSettings>("/api/settings")
  //     .then(setSettings)
  //     .catch((err) => setSettingsError(err.message));
  // }, []);
  //
  // useEffect(() => {
  //   setReservations(null);
  //   apiGet<{ reservations: Reservation[] }>(`/api/reservations?date=${toDateId(selectedDate)}`)
  //     .then((data) => setReservations(data.reservations))
  //     .catch((err) => setReservationsError(err.message));
  // }, [selectedDate]);

  // New: mock data generated locally in the frontend, no backend call.
  useEffect(() => {
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    setReservations(mockReservationsForDay(selectedDate));
  }, [selectedDate]);

  const resources = useMemo<CourtResource[]>(
    () => (settings ? settings.courts.map((court) => ({ resourceId: court.name, resourceTitle: court.name })) : []),
    [settings]
  );

  const events = useMemo<CalendarEvent[]>(() => {
    if (!reservations || !settings) return [];
    return reservations.map((r) => {
      const start = new Date(`${r.date}T${pad(r.startHour)}:00:00`);
      const end = new Date(start.getTime() + (r.durationMinutes ?? settings.slotDurationMinutes) * 60_000);
      return { id: r.id, title: r.customerName, start, end, resourceId: r.court, status: r.status };
    });
  }, [reservations, settings]);

  const error = settingsError ?? reservationsError;
  const loading = !error && (!settings || reservations === null);
  const isToday = selectedDate.getTime() === startOfDay(new Date()).getTime();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>
          <p className="mt-1 text-sm text-slate-500">All courts, one day at a glance (mock data).</p>
        </div>
        <button
          type="button"
          onClick={() => setBookingModalOpen(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          New booking
        </button>
      </div>

      {settings && (
        <BookingSearchModal
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          settings={settings}
          onBooked={() => setReservations(mockReservationsForDay(selectedDate))}
        />
      )}

      {error && <p className="mt-6 text-sm text-red-600">Failed to load: {error}</p>}

      {!error && loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

      {!error && settings && reservations !== null && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {dayjs(selectedDate).format("dddd, DD MMM YYYY")}
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={toDateId(selectedDate)}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(fromDateId(e.target.value));
                }}
                aria-label="Jump to date"
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="inline-flex overflow-hidden rounded-md ring-1 ring-inset ring-slate-300">
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => addDays(d, -1))}
                  aria-label="Previous day"
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(startOfDay(new Date()))}
                  disabled={isToday}
                  className="border-x border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => addDays(d, 1))}
                  aria-label="Next day"
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <Calendar
              localizer={localizer}
              date={selectedDate}
              onNavigate={() => {}}
              defaultView={Views.DAY}
              views={[Views.DAY]}
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
