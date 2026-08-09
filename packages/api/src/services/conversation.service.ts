import { sendList } from "./whatsapp.service";

function getWeekDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      id: `date:${d.toISOString().slice(0, 10)}`,
      title: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

export async function handleIncomingMessage(phone: string, text: string) {
  if (["hi", "hello", "book"].includes(text.trim().toLowerCase())) {
    await sendList(phone, "Which day would you like to book?", "Pick a day", getWeekDays());
  }
}