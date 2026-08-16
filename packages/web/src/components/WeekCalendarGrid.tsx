import dayjs from "dayjs";
import type { Reservation } from "../mocks/reservations.mock";
import type { ApiCourt } from "../api/courts.api";
import { courtColorFrom, type CourtColor } from "../lib/courtColors";

interface WeekCalendarGridProps {
  days: Date[];
  reservations: Reservation[];
  slotDurationMinutes: number;
  openHour: number;
  closeHour: number;
  courts: ApiCourt[];
  courtColors: Map<string, CourtColor>;
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
// Snapping to the full hour so a click anywhere in the "8-9" row always
// preselects 08:00-09:00, matching the only boundaries the grid actually draws.
const SNAP_MINUTES = 60;

// Subtle diagonal hatch marking a day that's already over — can't be booked anymore.
const PAST_DAY_PATTERN =
  "repeating-linear-gradient(45deg, rgba(148,163,184,0.08) 0px, rgba(148,163,184,0.08) 6px, transparent 6px, transparent 14px)";

interface PositionedEvent {
  reservation: Reservation;
  top: number;
  height: number;
  left: number;
  width: number;
  start: number; // minutes since midnight
  end: number; // minutes since midnight
}

interface CancelledSliver {
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
function packOverlaps(reservations: Reservation[], openHour: number, slotDurationMinutes: number): PositionedEvent[] {
  const sorted = [...reservations].sort((a, b) => a.startHour - b.startHour);

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
        start,
        end,
      });
    }
  }
  return positioned;
}

// Week view mixes every court into one day column. Packing purely by time
// overlap (packOverlaps above) let the same court land in a different
// sub-column on different days, undermining the color coding. Giving each
// court a fixed horizontal band keeps it in the same relative order every
// day; only courts with a reservation that day get a band, so an empty court
// doesn't leave dead space and shrink the rest into a corner.
//
// Cancelled bookings never enter packOverlaps (they'd otherwise compete for
// column width with an active booking, which is exactly what made a
// cancelled + active booking in the same slot look like a double-booking).
// They're laid out separately as thin slivers pinned to the edge of their
// court's band instead.
function layoutDay(
  dayReservations: Reservation[],
  openHour: number,
  slotDurationMinutes: number,
  courtOrder?: string[]
): { active: PositionedEvent[]; cancelled: CancelledSliver[] } {
  const active = dayReservations.filter((r) => r.status !== "cancelled");
  const cancelled = dayReservations.filter((r) => r.status === "cancelled");

  function sliverFor(r: Reservation, left: number, width: number): CancelledSliver {
    const { start, end } = eventRange(r, slotDurationMinutes);
    return {
      reservation: r,
      top: (start - openHour * 60) * PX_PER_MINUTE,
      height: Math.max((end - start) * PX_PER_MINUTE, 12),
      left,
      width,
    };
  }

  if (!courtOrder || courtOrder.length === 0) {
    return {
      active: packOverlaps(active, openHour, slotDurationMinutes),
      cancelled: cancelled.map((r) => sliverFor(r, 0, 100)),
    };
  }

  const presentCourts = courtOrder.filter((name) => dayReservations.some((r) => r.court === name));
  if (presentCourts.length === 0) return { active: [], cancelled: [] };

  const positioned: PositionedEvent[] = [];
  const slivers: CancelledSliver[] = [];
  const bandWidth = 100 / presentCourts.length;
  presentCourts.forEach((courtName, laneIndex) => {
    const bandLeft = laneIndex * bandWidth;
    const laneActive = active.filter((r) => r.court === courtName);
    const laneCancelled = cancelled.filter((r) => r.court === courtName);

    for (const event of packOverlaps(laneActive, openHour, slotDurationMinutes)) {
      positioned.push({
        ...event,
        left: bandLeft + (event.left / 100) * bandWidth,
        width: (event.width / 100) * bandWidth,
      });
    }
    for (const r of laneCancelled) {
      slivers.push(sliverFor(r, bandLeft, bandWidth));
    }
  });
  return { active: positioned, cancelled: slivers };
}

function formatHourLabel(hour: number): string {
  return dayjs().hour(hour).minute(0).format("HH:mm");
}

// startHour can carry fractional minutes (e.g. 9.5 for a 09:30 quick-add),
// so this can't reuse formatHourLabel's whole-hour assumption.
function formatEventTime(startHour: number): string {
  const totalMinutes = Math.round(startHour * 60);
  return dayjs().hour(Math.floor(totalMinutes / 60)).minute(totalMinutes % 60).format("h:mm A");
}

function formatMinutesOfDay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return dayjs().hour(h).minute(m).format("HH:mm");
}

function formatEventTimeRange(startMinutes: number, endMinutes: number): string {
  return `${formatMinutesOfDay(startMinutes)}–${formatMinutesOfDay(endMinutes)}`;
}

export function WeekCalendarGrid({
  days,
  reservations,
  slotDurationMinutes,
  openHour,
  closeHour,
  courts,
  courtColors,
  onSlotClick,
  onEventClick,
}: WeekCalendarGridProps) {
  const byCourt = days.length === 1;
  const today = dayjs().startOf("day");
  const courtOrder = Array.from(courtColors.keys());

  const columns: GridColumn[] = byCourt
    ? courts.map((c) => ({
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

  // Day view: every column shares the same date, so one line spans all of them
  // (no dot — a dot per court column would look like a row of repeated markers).
  // Week view: the line starts at today's column and runs to the end of the week.
  const todayColumnIndex = columns.findIndex((c) => dayjs(c.date).isSame(today, "day"));
  const showNowOverlay = showNowLine && todayColumnIndex !== -1;
  const nowLineStartIndex = byCourt ? 0 : todayColumnIndex;

  function handleColumnClick(column: GridColumn, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMinute = openHour * 60 + offsetY / PX_PER_MINUTE;
    const snapped = Math.floor(rawMinute / SNAP_MINUTES) * SNAP_MINUTES;
    onSlotClick(column.date, snapped, e.clientX, e.clientY, column.court);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-t border-slate-200 bg-white">
      {/* Column headers */}
      <div className="grid shrink-0 border-b border-slate-200" style={{ gridTemplateColumns: gridColumns }}>
        <div />
        {columns.map((column) => {
          if (byCourt) {
            const dot = courtColorFrom(courtColors, column.court!);
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
        <div className="relative grid" style={{ gridTemplateColumns: "64px 1fr" }}>
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
            {showNowOverlay && (
              // Gated on showNowOverlay (not just showNowLine) so this only appears when
              // today is actually one of the displayed columns — otherwise it reads as
              // "the time in this view" when it's really just the wall-clock time.
              // Same right-aligned, vertically-centered placement as the hour labels above,
              // just styled as a pill so it reads as "now" rather than another fixed hour mark.
              <div
                className="absolute right-2 z-20 -translate-y-1/2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ top: nowTop }}
              >
                {now.format("HH:mm")}
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="relative" style={{ height: gridHeight }}>
            <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
              {columns.map((column) => {
                const dateId = dayjs(column.date).format("YYYY-MM-DD");
                const columnReservations = reservations.filter(
                  (r) => r.date === dateId && (!column.court || r.court === column.court)
                );
                const { active: positioned, cancelled: slivers } = layoutDay(
                  columnReservations,
                  openHour,
                  slotDurationMinutes,
                  byCourt ? undefined : courtOrder
                );
                const isPast = dayjs(column.date).isBefore(today, "day");

                return (
                  <div
                    key={column.key}
                    className="relative cursor-pointer border-l border-slate-100"
                    style={{ backgroundImage: isPast ? PAST_DAY_PATTERN : undefined }}
                    onClick={(e) => handleColumnClick(column, e)}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-slate-100"
                        style={{ top: (h - openHour) * 60 * PX_PER_MINUTE }}
                      />
                    ))}

                    {positioned.map(({ reservation, top, height, left, width, start, end }) => {
                      const color = courtColorFrom(courtColors, reservation.court);
                      const timeLabel = byCourt
                        ? formatEventTimeRange(start, end)
                        : `${reservation.court} · ${formatEventTime(reservation.startHour)}`;
                      return (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(reservation);
                          }}
                          title={byCourt ? `${reservation.customerName} · ${formatEventTimeRange(start, end)}` : undefined}
                          className={`absolute overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition-shadow hover:shadow-md ${color.bg} ${color.text}`}
                          style={{
                            top,
                            height,
                            left: `calc(${left}% + 2px)`,
                            width: `calc(${width}% - 4px)`,
                            borderColor: "rgba(15,23,42,0.08)",
                          }}
                        >
                          <div className="truncate font-semibold">{reservation.customerName}</div>
                          <div className="truncate opacity-80">{timeLabel}</div>
                        </button>
                      );
                    })}

                    {slivers.map(({ reservation, top, height, left, width }) => (
                      <div
                        key={reservation.id}
                        title={`Cancelled — ${reservation.customerName} · ${formatEventTime(reservation.startHour)}`}
                        className="absolute w-1.5 rounded-full bg-slate-300 opacity-70"
                        style={{ top, height, left: `calc(${left}% + ${width}% - 6px)` }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {showNowOverlay && (
              <div
                className="pointer-events-none absolute z-10 flex items-center"
                style={{ top: nowTop, left: `${(nowLineStartIndex / columns.length) * 100}%`, right: 0 }}
              >
                {!byCourt && <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                <span className="h-px flex-1 bg-blue-400" />
              </div>
            )}
          </div>

          {showNowOverlay && (
            // Bridges the gutter's "now" badge to the dot, which can sit several
            // columns to the right in week view — without this the dashed line stopped
            // at the gutter's edge, leaving a visible gap before the dot.
            <div
              className="pointer-events-none absolute left-0 z-10 border-t border-dashed border-slate-300"
              style={{
                top: nowTop,
                width: `calc(64px + (100% - 64px) * ${nowLineStartIndex / columns.length})`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
