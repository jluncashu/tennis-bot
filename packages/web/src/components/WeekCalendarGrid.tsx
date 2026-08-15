import dayjs from "dayjs";
import type { Reservation, ReservationStatus } from "../mocks/reservations.mock";
import type { Court } from "../mocks/settings.mock";

interface WeekCalendarGridProps {
  days: Date[];
  reservations: Reservation[];
  slotDurationMinutes: number;
  openHour: number;
  closeHour: number;
  // When set (and days.length === 1), the grid renders one column per court
  // for that single day instead of one column per day.
  courts?: Court[];
  onSlotClick: (date: Date, minuteOfDay: number, clientX: number, clientY: number, court?: string) => void;
  onEventClick: (reservation: Reservation) => void;
}

interface GridColumn {
  key: string;
  date: Date;
  court?: string;
  headerTop: string;
  headerMain: string;
}

const PX_PER_MINUTE = 1.1;
const SNAP_MINUTES = 15;

// Subtle diagonal hatch marking a day that's already over — can't be booked anymore.
const PAST_DAY_PATTERN =
  "repeating-linear-gradient(45deg, rgba(148,163,184,0.08) 0px, rgba(148,163,184,0.08) 6px, transparent 6px, transparent 14px)";

const PALETTE = [
  { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-400" },
  { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-400" },
  { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-400" },
  { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
  { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-400" },
  { bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-400" },
];

export function courtColor(court: string) {
  let h = 0;
  for (let i = 0; i < court.length; i++) h = (h * 31 + court.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface PositionedEvent {
  reservation: Reservation;
  top: number;
  height: number;
  left: number;
  width: number;
}

function eventRange(r: Reservation, slotDurationMinutes: number) {
  const start = r.startHour * 60;
  const end = start + (r.durationMinutes ?? slotDurationMinutes);
  return { start, end };
}

// Classic calendar-event layout: cluster mutually-overlapping events, then
// pack each cluster into as few side-by-side columns as fit without overlap.
function layoutDay(dayReservations: Reservation[], openHour: number, slotDurationMinutes: number): PositionedEvent[] {
  const sorted = [...dayReservations].sort((a, b) => a.startHour - b.startHour);

  const clusters: Reservation[][] = [];
  let current: Reservation[] = [];
  let clusterEnd = -Infinity;
  for (const r of sorted) {
    const { start, end } = eventRange(r, slotDurationMinutes);
    if (current.length > 0 && start >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(r);
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (current.length > 0) clusters.push(current);

  const positioned: PositionedEvent[] = [];
  for (const cluster of clusters) {
    const columns: Reservation[][] = [];
    const columnOf = new Map<Reservation, number>();
    for (const r of cluster) {
      const { start } = eventRange(r, slotDurationMinutes);
      let placedIn = -1;
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if (eventRange(last, slotDurationMinutes).end <= start) {
          placedIn = i;
          break;
        }
      }
      if (placedIn === -1) {
        columns.push([r]);
        placedIn = columns.length - 1;
      } else {
        columns[placedIn].push(r);
      }
      columnOf.set(r, placedIn);
    }
    const totalColumns = columns.length;
    for (const r of cluster) {
      const { start, end } = eventRange(r, slotDurationMinutes);
      const col = columnOf.get(r)!;
      positioned.push({
        reservation: r,
        top: (start - openHour * 60) * PX_PER_MINUTE,
        height: Math.max((end - start) * PX_PER_MINUTE, 20),
        left: (col / totalColumns) * 100,
        width: (1 / totalColumns) * 100,
      });
    }
  }
  return positioned;
}

function formatHourLabel(hour: number): string {
  return dayjs().hour(hour).minute(0).format("h A");
}

// startHour can carry fractional minutes (e.g. 9.5 for a 09:30 quick-add),
// so this can't reuse formatHourLabel's whole-hour assumption.
function formatEventTime(startHour: number): string {
  const totalMinutes = Math.round(startHour * 60);
  return dayjs().hour(Math.floor(totalMinutes / 60)).minute(totalMinutes % 60).format("h:mm A");
}

const STATUS_STYLE: Record<ReservationStatus, string> = {
  confirmed: "",
  pending: "border-dashed",
  cancelled: "opacity-50 line-through",
};

export function WeekCalendarGrid({
  days,
  reservations,
  slotDurationMinutes,
  openHour,
  closeHour,
  courts,
  onSlotClick,
  onEventClick,
}: WeekCalendarGridProps) {
  const byCourt = !!courts && days.length === 1;
  const today = dayjs().startOf("day");

  const columns: GridColumn[] = byCourt
    ? courts!.map((c) => ({
        key: c.name,
        date: days[0],
        court: c.name,
        headerTop: c.covered ? "Covered" : "Outdoor",
        headerMain: c.name,
      }))
    : days.map((d) => ({
        key: d.toISOString(),
        date: d,
        headerTop: dayjs(d).format("ddd"),
        headerMain: String(d.getDate()),
      }));

  const gridColumns = `64px repeat(${columns.length}, 1fr)`;
  const totalMinutes = (closeHour - openHour) * 60;
  const gridHeight = totalMinutes * PX_PER_MINUTE;
  const hours = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);

  const now = dayjs();
  const nowMinuteOfDay = now.hour() * 60 + now.minute();
  const showNowLine = nowMinuteOfDay >= openHour * 60 && nowMinuteOfDay <= closeHour * 60;
  const nowTop = (nowMinuteOfDay - openHour * 60) * PX_PER_MINUTE;

  function handleColumnClick(column: GridColumn, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMinute = openHour * 60 + offsetY / PX_PER_MINUTE;
    const snapped = Math.round(rawMinute / SNAP_MINUTES) * SNAP_MINUTES;
    onSlotClick(column.date, snapped, e.clientX, e.clientY, column.court);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-t border-slate-200 bg-white">
      {/* Column headers */}
      <div className="grid shrink-0 border-b border-slate-200" style={{ gridTemplateColumns: gridColumns }}>
        <div />
        {columns.map((column) => {
          if (byCourt) {
            const dot = courtColor(column.court!);
            return (
              <div key={column.key} className="flex flex-col items-center gap-1 py-3">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {column.headerTop}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot.dot}`} />
                  {column.headerMain}
                </span>
              </div>
            );
          }
          const isToday = dayjs(column.date).isSame(today, "day");
          return (
            <div key={column.key} className="flex flex-col items-center gap-1 py-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {column.headerTop}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                {column.headerMain}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
          {/* Time gutter */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                // The first label sits flush at top:0 instead of centering on the
                // line, since centering would push half of it above the scroll clip.
                className={`absolute left-0 right-2 text-right text-[11px] text-slate-400 ${
                  h === openHour ? "" : "-translate-y-1/2"
                }`}
                style={{ top: (h - openHour) * 60 * PX_PER_MINUTE }}
              >
                {formatHourLabel(h)}
              </div>
            ))}
            {showNowLine && (
              // Overshoots the gutter's true right edge by a few px so the dashed
              // connector always reaches under the red dot, regardless of where a
              // dashed border's repeating pattern happens to land at the boundary.
              <div
                className="absolute left-0 flex -translate-y-1/2 items-center gap-1 pl-1"
                style={{ top: nowTop, right: -8 }}
              >
                <span className="shrink-0 text-[11px] font-medium text-slate-400">{now.format("h:mm A")}</span>
                <span className="flex-1 border-t border-dashed border-slate-300" />
              </div>
            )}
          </div>

          {/* Columns */}
          {columns.map((column) => {
            const dateId = dayjs(column.date).format("YYYY-MM-DD");
            const columnReservations = reservations.filter(
              (r) => r.date === dateId && (!column.court || r.court === column.court)
            );
            const positioned = layoutDay(columnReservations, openHour, slotDurationMinutes);
            const isToday = dayjs(column.date).isSame(today, "day");
            const isPast = dayjs(column.date).isBefore(today, "day");

            return (
              <div
                key={column.key}
                className="relative cursor-pointer border-l border-slate-100"
                style={{ height: gridHeight, backgroundImage: isPast ? PAST_DAY_PATTERN : undefined }}
                onClick={(e) => handleColumnClick(column, e)}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: (h - openHour) * 60 * PX_PER_MINUTE }}
                  />
                ))}

                {isToday && showNowLine && (
                  <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                    <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-400" />
                  </div>
                )}

                {positioned.map(({ reservation, top, height, left, width }) => {
                  const color = courtColor(reservation.court);
                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(reservation);
                      }}
                      className={`absolute overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition-shadow hover:shadow-md ${color.bg} ${color.text} ${STATUS_STYLE[reservation.status]}`}
                      style={{
                        top,
                        height,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        borderColor: "rgba(15,23,42,0.08)",
                      }}
                    >
                      <div className="truncate font-semibold">{reservation.customerName}</div>
                      <div className="truncate opacity-80">
                        {byCourt ? formatEventTime(reservation.startHour) : `${reservation.court} · ${formatEventTime(reservation.startHour)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
