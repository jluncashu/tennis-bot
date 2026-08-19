import ExcelJS from "exceljs";

// Mirrors packages/web/src/lib/courtColors.ts's PALETTE exactly (same hue
// order, same "assign by list position" rule) so a court gets the same
// color here as it does in the dashboard. `fill` = the hue's 500 shade
// (header, full saturation); `tint` = the 100 shade (soft booked-cell
// background, same shade the frontend uses for its booking cards). Hex
// values were computed from this project's installed Tailwind v4 OKLCH
// theme, not the old Tailwind v3 hex table, since v4 shifted them slightly.
const COURT_PALETTE: { fill: string; tint: string }[] = [
  { fill: "8E51FF", tint: "EDE9FE" }, // violet
  { fill: "00BC7D", tint: "D0FAE5" }, // emerald
  { fill: "00A6F4", tint: "DFF2FE" }, // sky
  { fill: "FE9A00", tint: "FEF3C6" }, // amber
  { fill: "FF2056", tint: "FFE4E6" }, // rose
  { fill: "00BBA7", tint: "CBFBF1" }, // teal
  { fill: "615FFF", tint: "E0E7FF" }, // indigo
  { fill: "7CCF00", tint: "ECFCCA" }, // lime
  { fill: "E12AFB", tint: "FAE8FF" }, // fuchsia
  { fill: "00B8DB", tint: "CEFAFE" }, // cyan
  { fill: "FF6900", tint: "FFEDD4" }, // orange
  { fill: "F6339A", tint: "FCE7F3" }, // pink
];

const CLOSED_FILL = "F1F5F9"; // slate-100
const CLOSED_TEXT = "62748E"; // slate-500
const BORDER_GRAY = "CAD5E2"; // slate-300

function solidFill(hex: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: `FF${hex}` } };
}

const thinBorder = { style: "thin" as const, color: { argb: `FF${BORDER_GRAY}` } };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[dow]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export interface GridCourt {
  id: string;
  name: string;
}

export interface GridWindow {
  startTime: string; // HH:MM(:SS)
  endTime: string;
}

export interface GridBooking {
  startTime: string;
  endTime: string;
  customerName: string | null;
}

export interface DailyGridInput {
  clubName: string;
  date: string; // YYYY-MM-DD
  courts: GridCourt[]; // stable, dashboard-matching order
  openRulesByCourtId: Map<string, GridWindow[]>; // already filtered to this date's day-of-week; empty = closed all day
  bookingsByCourtId: Map<string, GridBooking[]>; // confirmed only
  slotDurationMinutesByCourtId: Map<string, number>; // effective duration (court override or club default)
}

export async function buildDailyGridWorkbook(input: DailyGridInput): Promise<ExcelJS.Buffer> {
  const { clubName, date, courts, openRulesByCourtId, bookingsByCourtId, slotDurationMinutesByCourtId } = input;

  const openCourts = courts.filter((c) => (openRulesByCourtId.get(c.id) ?? []).length > 0);
  const allRuleWindows = openCourts.flatMap((c) => openRulesByCourtId.get(c.id) ?? []);
  const earliestStart = allRuleWindows.length ? Math.min(...allRuleWindows.map((r) => toMinutes(r.startTime))) : null;
  const latestEnd = allRuleWindows.length ? Math.max(...allRuleWindows.map((r) => toMinutes(r.endTime))) : null;

  // The finest granularity among open courts, so no booking's boundary
  // (which aligns to its own court's slot duration) falls mid-row.
  const rowMinutes = openCourts.length
    ? Math.min(...openCourts.map((c) => slotDurationMinutesByCourtId.get(c.id) ?? 60))
    : 60;

  const rowStarts: number[] = [];
  if (earliestStart !== null && latestEnd !== null) {
    for (let t = earliestStart; t + rowMinutes <= latestEnd; t += rowMinutes) rowStarts.push(t);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bookings");
  const colCount = 1 + courts.length;

  sheet.getColumn(1).width = 11;
  courts.forEach((_, i) => (sheet.getColumn(2 + i).width = 28));

  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${clubName} — ${formatDateLong(date)}`;
  titleCell.font = { bold: true, size: 14 };
  // Row 2 left blank as a spacer.

  const headerRowIndex = 3;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.height = 30;
  courts.forEach((court, i) => {
    const isOpenToday = (openRulesByCourtId.get(court.id) ?? []).length > 0;
    const cell = headerRow.getCell(2 + i);
    cell.value = court.name;
    cell.font = { bold: true, size: 12, color: { argb: isOpenToday ? "FFFFFFFF" : `FF${CLOSED_TEXT}` } };
    cell.fill = solidFill(isOpenToday ? COURT_PALETTE[i % COURT_PALETTE.length].fill : CLOSED_FILL);
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Tracks, per court, the last row index already covered by a previous
  // booking's vertical merge, so a multi-row booking isn't rendered again
  // in the rows it spans.
  const consumedUntilRowIdx = new Map<string, number>(courts.map((c) => [c.id, -1]));
  // Every multi-row merge, so the grid-line pass below can skip the border
  // that would otherwise cut through the middle of a merged booking cell.
  const merges: { col: number; startRow: number; endRow: number }[] = [];

  rowStarts.forEach((rowStartMinutes, rowIdx) => {
    const excelRow = headerRowIndex + 1 + rowIdx;
    const row = sheet.getRow(excelRow);
    row.height = 34;

    const timeCell = row.getCell(1);
    timeCell.value = toTimeLabel(rowStartMinutes);
    timeCell.font = { bold: true, size: 11 };
    timeCell.alignment = { horizontal: "right", vertical: "middle" };

    courts.forEach((court, i) => {
      const colIndex = 2 + i;
      if (rowIdx <= (consumedUntilRowIdx.get(court.id) ?? -1)) return; // inside an already-merged booking cell

      const rules = openRulesByCourtId.get(court.id) ?? [];
      if (rules.length === 0) {
        sheet.getCell(excelRow, colIndex).fill = solidFill(CLOSED_FILL);
        return;
      }

      const rowEndMinutes = rowStartMinutes + rowMinutes;
      const withinOpenWindow = rules.some(
        (r) => toMinutes(r.startTime) <= rowStartMinutes && rowEndMinutes <= toMinutes(r.endTime)
      );
      if (!withinOpenWindow) {
        sheet.getCell(excelRow, colIndex).fill = solidFill(CLOSED_FILL);
        return;
      }

      const booking = (bookingsByCourtId.get(court.id) ?? []).find((b) => toMinutes(b.startTime) === rowStartMinutes);
      if (!booking) return; // genuinely free — left blank, no fill, no border

      const spanRows = Math.max(1, Math.round((toMinutes(booking.endTime) - toMinutes(booking.startTime)) / rowMinutes));
      const lastRowIdx = rowIdx + spanRows - 1;
      const lastExcelRowOfMerge = headerRowIndex + 1 + lastRowIdx;
      consumedUntilRowIdx.set(court.id, lastRowIdx);

      if (spanRows > 1) {
        sheet.mergeCells(excelRow, colIndex, lastExcelRowOfMerge, colIndex);
        merges.push({ col: colIndex, startRow: excelRow, endRow: lastExcelRowOfMerge });
      }

      const cell = sheet.getCell(excelRow, colIndex);
      cell.value = {
        richText: [
          { font: { bold: true, size: 11 }, text: booking.customerName ?? "" },
          { font: { size: 10 }, text: `\n${toTimeLabel(toMinutes(booking.startTime))}–${toTimeLabel(toMinutes(booking.endTime))}` },
        ],
      };
      cell.fill = solidFill(COURT_PALETTE[i % COURT_PALETTE.length].tint);
      cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    });
  });

  // Grid lines across the whole table (header + every time row). A merged
  // multi-row booking cell only gets its outer edge bordered — no divider
  // line cutting through the middle of it.
  const lastExcelRow = headerRowIndex + rowStarts.length;
  for (let row = headerRowIndex; row <= lastExcelRow; row++) {
    for (let col = 1; col <= colCount; col++) {
      const merge = merges.find((m) => m.col === col && row >= m.startRow && row <= m.endRow);
      sheet.getCell(row, col).border = {
        top: !merge || row === merge.startRow ? thinBorder : undefined,
        bottom: !merge || row === merge.endRow ? thinBorder : undefined,
        left: thinBorder,
        right: thinBorder,
      };
    }
  }

  return workbook.xlsx.writeBuffer();
}
