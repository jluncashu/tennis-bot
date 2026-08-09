import { sendList, sendText } from "./whatsapp.service";

function getWeekDays(weekOffset: number) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7 + i);
    days.push({
      id: `date:${d.toISOString().slice(0, 10)}`,
      title: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

function getNavRows(weekOffset: number) {
  const rows = [];
  if (weekOffset > 0) {
    rows.push({ id: `nav:week:${weekOffset - 1}`, title: "◀ Previous week" });
  }
  rows.push({ id: `nav:week:${weekOffset + 1}`, title: "Next week ▶" });
  return rows;
}

function formatWeekRange(weekOffset: number) {
  const start = new Date();
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

async function sendWeekPicker(phone: string, weekOffset: number) {
  await sendList(phone, `Which day would you like to book? (${formatWeekRange(weekOffset)})`, "Pick a day", [
    { title: "Available days", rows: getWeekDays(weekOffset) },
    { title: "Navigate", rows: getNavRows(weekOffset) },
  ]);
}

// WhatsApp list messages cap out at 10 rows total, so hourly slots across
// an 08:00-22:00 day (14 of them) won't fit — 2-hour frames (7 rows) do.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;
const SLOT_HOURS = 2;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function getSlotRows(date: string) {
  const rows = [];
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour += SLOT_HOURS) {
    rows.push({
      id: `slot:${date}:${hour}`,
      title: `${pad(hour)}:00 - ${pad(hour + SLOT_HOURS)}:00`,
    });
  }
  return rows;
}

async function sendSlotPicker(phone: string, date: string) {
  await sendList(phone, `Which time on ${date}?`, "Pick a time", [{ title: "Available times", rows: getSlotRows(date) }]);
}

const COVERED_COURTS = 4;
const UNCOVERED_COURTS = 1;

function getCourtRows(date: string, hour: string, covered: boolean, count: number) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      id: `court:${date}:${hour}:${covered ? "covered" : "uncovered"}:${i}`,
      title: `Court ${i} (${covered ? "covered" : "uncovered"})`,
    });
  }
  return rows;
}

async function sendCourtPicker(phone: string, date: string, hour: string) {
  await sendList(phone, `Which court for ${date}, ${pad(Number(hour))}:00?`, "Pick a court", [
    { title: "Covered courts", rows: getCourtRows(date, hour, true, COVERED_COURTS) },
    { title: "Uncovered courts", rows: getCourtRows(date, hour, false, UNCOVERED_COURTS) },
  ]);
}

export async function handleIncomingMessage(phone: string, text: string) {
  if (["hi", "hello", "book"].includes(text.trim().toLowerCase())) {
    await sendWeekPicker(phone, 0);
  }
}

export async function handleListReply(phone: string, replyId: string) {
  const navMatch = replyId.match(/^nav:week:(\d+)$/);
  if (navMatch) {
    await sendWeekPicker(phone, Number(navMatch[1]));
    return;
  }

  if (replyId.startsWith("date:")) {
    const date = replyId.slice("date:".length);
    await sendSlotPicker(phone, date);
    return;
  }

  const slotMatch = replyId.match(/^slot:(\d{4}-\d{2}-\d{2}):(\d+)$/);
  if (slotMatch) {
    const [, date, hour] = slotMatch;
    await sendCourtPicker(phone, date, hour);
    return;
  }

  const courtMatch = replyId.match(/^court:(\d{4}-\d{2}-\d{2}):(\d+):(covered|uncovered):(\d+)$/);
  if (courtMatch) {
    const [, date, hour, type, num] = courtMatch;
    await sendText(
      phone,
      `Got it — ${type} court ${num} on ${date} at ${pad(Number(hour))}:00. Booking isn't persisted yet.`
    );
  }
}
