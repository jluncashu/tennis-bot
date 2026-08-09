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
    await sendText(phone, `Got it — ${date}. Slot selection isn't wired up yet.`);
  }
}
