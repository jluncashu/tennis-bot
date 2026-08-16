import { sendList, sendButtons, sendText } from "../../services/whatsapp.service";
import { findOrCreateContact } from "../contacts/contacts.service";
import { getState, setState, clearState } from "../conversation-state/conversation-state.repository";
import type { ConversationState } from "../conversation-state/conversation-state.schema";
import { getAvailableDates, getAvailableSlots, getConsecutiveDurations } from "../booking-availability/booking-availability.service";
import { listCourts, getCourt } from "../courts/courts.service";
import { createBookingForCustomer, cancelBookingForClub, listUpcomingBookingsForCustomer } from "../booking/booking.service";
import { findClubById } from "../auth/auth.repository";
import { findClubWideClosure } from "../schedule-exceptions/schedule-exceptions.service";

const ENTRY_TRIGGERS = ["hi", "hello", "book", "start"];
const MAX_WEEK_OFFSET = 2; // caps date lookahead at 3 weeks (offsets 0, 1, 2)
const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
// WhatsApp interactive lists hard-cap total rows at 10, and a full day of
// hourly slots easily exceeds that — page at 9 to leave room for "more".
const TIME_PAGE_SIZE = 9;
// Buttons only work up to 3 options, so cap how many consecutive-hour
// choices we offer at the duration step.
const MAX_DURATION_UNITS = 3;

interface IncomingMessage {
  text?: string;
  buttonId?: string;
}

type FlowData = {
  date?: string;
  courtId?: string;
  startTime?: string;
  endTime?: string;
  weekOffset?: number;
  slotOffset?: number;
  bookingIds?: string[];
};

function formatDateTitle(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function numberEmoji(n: number): string {
  return NUMBER_EMOJIS[n - 1] ?? `${n}.`;
}

// Labels duration options from the actual clock range rather than assuming
// hour-long grid cells, so it stays correct for clubs using 30/90-min slots.
function formatDuration(startTime: string, endTime: string): string {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const mins = toMin(endTime) - toMin(startTime);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export async function handleIncomingMessage(
  clubId: string,
  phone: string,
  message: IncomingMessage
): Promise<void> {
  await findOrCreateContact(phone);

  if (message.buttonId) {
    return handleReply(clubId, phone, message.buttonId);
  }

  const rawText = message.text?.trim();
  if (!rawText) return;
  const text = rawText.toLowerCase();

  // "menu"/"cancel" are the universal escape hatch — they work regardless of
  // the customer's current step.
  if (text === "menu" || text === "cancel") {
    return sendEntry(clubId, phone);
  }

  if (text === "help") {
    return sendHelp(phone);
  }

  if (text === "my bookings" || text === "mybookings" || text === "bookings") {
    return sendMyBookings(clubId, phone);
  }

  const state = await getState(clubId, phone);

  if (state?.step === "cancel_pick") {
    return handleCancelPick(clubId, phone, state, text);
  }

  if (state?.step === "ask_name") {
    return handleNameEntered(clubId, phone, state, rawText);
  }

  if (!state || ENTRY_TRIGGERS.includes(text)) {
    return sendEntry(clubId, phone);
  }

  await sendText(phone, 'Please pick an option from the list above, or type "menu" to start over.');
}

async function handleReply(clubId: string, phone: string, replyId: string): Promise<void> {
  const state = await getState(clubId, phone);

  if (replyId === "menu:book") return sendDatePicker(clubId, phone, 0);
  if (replyId === "menu:mybookings") return sendMyBookings(clubId, phone);
  if (replyId === "menu:help") return sendHelp(phone);
  if (replyId === "closed:pickday") return sendDatePicker(clubId, phone, 0);

  if (replyId === "nav:next") {
    const weekOffset = state?.step === "choose_date" ? (state.data as FlowData).weekOffset ?? 0 : 0;
    return sendDatePicker(clubId, phone, weekOffset + 1);
  }

  if (replyId.startsWith("date:")) {
    return handleDateChosen(clubId, phone, replyId.slice("date:".length));
  }

  if (replyId.startsWith("court:") && state?.step === "choose_court") {
    return handleCourtChosen(clubId, phone, state, replyId.slice("court:".length));
  }

  if (replyId.startsWith("time:more:") && state?.step === "choose_time") {
    const { date, courtId } = state.data as FlowData;
    if (!date || !courtId) return sendDatePicker(clubId, phone, 0);
    const offset = Number(replyId.slice("time:more:".length));
    const sent = await sendTimeList(clubId, phone, date, courtId, offset);
    if (!sent) {
      await sendText(phone, "That court just filled up for this day. Pick another day.");
      return sendDatePicker(clubId, phone, 0);
    }
    return;
  }

  if (replyId.startsWith("time:") && state?.step === "choose_time") {
    return handleTimeChosen(clubId, phone, state, replyId.slice("time:".length));
  }

  if (replyId.startsWith("duration:") && state?.step === "choose_duration") {
    return handleDurationChosen(clubId, phone, state, Number(replyId.slice("duration:".length)));
  }

  if (replyId === "confirm:yes" && state?.step === "confirm") {
    return handleConfirmYes(clubId, phone, state);
  }

  if (replyId === "confirm:no" && state?.step === "confirm") {
    await clearState(clubId, phone);
    await sendText(phone, 'No problem — reply "book" whenever you\'re ready.');
    return;
  }

  await sendText(phone, 'That option is no longer valid — send "menu" to start over.');
}

async function sendEntry(clubId: string, phone: string): Promise<void> {
  await clearState(clubId, phone);
  const club = await findClubById(clubId);

  await sendButtons(phone, `🎾 Welcome to ${club?.name ?? "the club"}! What would you like to do?`, [
    { id: "menu:book", title: "Book a court" },
    { id: "menu:mybookings", title: "My bookings" },
    { id: "menu:help", title: "Help" },
  ]);
}

async function sendHelp(phone: string): Promise<void> {
  await sendText(
    phone,
    'Here\'s what I can do:\n• "book" — book a court\n• "my bookings" — view or cancel a booking\n• "menu" — start over anytime'
  );
}

async function sendDatePicker(clubId: string, phone: string, weekOffset: number): Promise<void> {
  const effectiveOffset = Math.min(Math.max(weekOffset, 0), MAX_WEEK_OFFSET);
  const days = await getAvailableDates(clubId, effectiveOffset);

  await setState(clubId, phone, "choose_date", { weekOffset: effectiveOffset } satisfies FlowData);

  const rows = days.map((d, i) => ({
    id: `date:${d.date}`,
    title: effectiveOffset === 0 && i === 0 ? `${formatDateTitle(d.date)} — Today` : formatDateTitle(d.date),
    ...(d.hasAvailability ? {} : { description: "No courts available" }),
  }));

  if (effectiveOffset < MAX_WEEK_OFFSET) {
    rows.push({ id: "nav:next", title: "➜ See next week" });
  }

  await sendList(phone, "Which day would you like to book?", "Pick a day", [{ title: "Days", rows }]);
}

async function handleDateChosen(clubId: string, phone: string, date: string): Promise<void> {
  const closure = await findClubWideClosure(clubId, date);
  if (closure) {
    const club = await findClubById(clubId);
    await setState(clubId, phone, "choose_date", {});
    await sendButtons(
      phone,
      `${club?.name ?? "The club"} is closed on ${formatDateTitle(date)}${closure.reason ? `: ${closure.reason}` : ""}. Try another day?`,
      [{ id: "closed:pickday", title: "Pick another day" }]
    );
    return;
  }

  const clubCourts = await listCourts(clubId);

  const courtsWithAvailability: { id: string; name: string }[] = [];
  for (const court of clubCourts) {
    const slots = await getAvailableSlots(clubId, court.id, date);
    if (slots.length > 0) courtsWithAvailability.push({ id: court.id, name: court.name });
  }

  if (courtsWithAvailability.length === 0) {
    await sendText(phone, `No courts are available on ${formatDateTitle(date)}. Pick another day.`);
    return sendDatePicker(clubId, phone, 0);
  }

  await setState(clubId, phone, "choose_court", { date } satisfies FlowData);

  const bodyText = `${formatDateTitle(date)} — which court?`;
  if (courtsWithAvailability.length <= 3) {
    await sendButtons(
      phone,
      bodyText,
      courtsWithAvailability.map((c) => ({ id: `court:${c.id}`, title: c.name.slice(0, 20) }))
    );
  } else {
    await sendList(phone, bodyText, "Pick a court", [
      { title: "Courts", rows: courtsWithAvailability.map((c) => ({ id: `court:${c.id}`, title: c.name })) },
    ]);
  }
}

// Fetches free slots and sends the time-picker list; returns false (without
// sending) if the court has filled up in the meantime, so callers can fall
// back to the date picker with their own copy. Paginates past the WhatsApp
// 10-row list cap via a trailing "more times" row.
async function sendTimeList(
  clubId: string,
  phone: string,
  date: string,
  courtId: string,
  offset = 0
): Promise<boolean> {
  const slots = await getAvailableSlots(clubId, courtId, date);
  if (slots.length === 0) return false;

  const needsPaging = slots.length > 10;
  const effectiveOffset = Math.min(offset, Math.max(slots.length - 1, 0));
  const pageSize = needsPaging ? TIME_PAGE_SIZE : slots.length;
  const page = slots.slice(effectiveOffset, effectiveOffset + pageSize);
  const nextOffset = effectiveOffset + pageSize;

  const court = await getCourt(courtId, clubId);
  await setState(clubId, phone, "choose_time", { date, courtId, slotOffset: effectiveOffset } satisfies FlowData);

  const rows: { id: string; title: string }[] = page.map((s) => ({ id: `time:${s.startTime}`, title: s.startTime }));
  if (nextOffset < slots.length) {
    rows.push({ id: `time:more:${nextOffset}`, title: "➜ More times" });
  }

  await sendList(phone, `${court.name}, ${formatDateTitle(date)} — pick a time`, "Pick a time", [
    { title: "Available times", rows },
  ]);
  return true;
}

async function handleCourtChosen(
  clubId: string,
  phone: string,
  state: ConversationState,
  courtId: string
): Promise<void> {
  const { date } = state.data as FlowData;
  if (!date) return sendDatePicker(clubId, phone, 0);

  const sent = await sendTimeList(clubId, phone, date, courtId);
  if (!sent) {
    await sendText(phone, "That court just filled up for this day. Pick another day.");
    return sendDatePicker(clubId, phone, 0);
  }
}

async function handleTimeChosen(
  clubId: string,
  phone: string,
  state: ConversationState,
  startTime: string
): Promise<void> {
  const { date, courtId } = state.data as FlowData;
  if (!date || !courtId) return sendDatePicker(clubId, phone, 0);

  const durations = await getConsecutiveDurations(clubId, courtId, date, startTime, MAX_DURATION_UNITS);
  if (durations.length === 0) {
    await sendText(phone, "That time just filled up. Pick another.");
    const sent = await sendTimeList(clubId, phone, date, courtId);
    if (!sent) {
      await sendText(phone, "That court just filled up for this day. Pick another day.");
      return sendDatePicker(clubId, phone, 0);
    }
    return;
  }

  // Only one hour possible from here (already booked right after, or the
  // court closes) — nothing to ask, just proceed with that single slot.
  if (durations.length === 1) {
    return proceedAfterDuration(clubId, phone, courtId, date, startTime, durations[0].endTime);
  }

  await setState(clubId, phone, "choose_duration", { date, courtId, startTime } satisfies FlowData);
  await sendButtons(
    phone,
    "How long would you like to book?",
    durations.map((d) => ({ id: `duration:${d.units}`, title: formatDuration(startTime, d.endTime) }))
  );
}

async function handleDurationChosen(
  clubId: string,
  phone: string,
  state: ConversationState,
  units: number
): Promise<void> {
  const { date, courtId, startTime } = state.data as FlowData;
  if (!date || !courtId || !startTime) return sendDatePicker(clubId, phone, 0);

  const durations = await getConsecutiveDurations(clubId, courtId, date, startTime, MAX_DURATION_UNITS);
  const match = durations.find((d) => d.units === units);
  if (!match) {
    await sendText(phone, "Sorry, that's no longer available. Let's find another time.");
    const sent = await sendTimeList(clubId, phone, date, courtId);
    if (!sent) {
      await sendText(phone, "That court just filled up for this day. Pick another day.");
      return sendDatePicker(clubId, phone, 0);
    }
    return;
  }

  await proceedAfterDuration(clubId, phone, courtId, date, startTime, match.endTime);
}

async function proceedAfterDuration(
  clubId: string,
  phone: string,
  courtId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<void> {
  const [contact, court] = await Promise.all([findOrCreateContact(phone), getCourt(courtId, clubId)]);

  if (!contact.name) {
    await setState(clubId, phone, "ask_name", { date, courtId, startTime, endTime } satisfies FlowData);
    await sendText(phone, "What name should I put on this booking?");
    return;
  }

  await sendConfirm(clubId, phone, courtId, court.name, date, startTime, endTime);
}

async function handleNameEntered(
  clubId: string,
  phone: string,
  state: ConversationState,
  rawText: string
): Promise<void> {
  const { date, courtId, startTime, endTime } = state.data as FlowData;
  if (!date || !courtId || !startTime) return sendDatePicker(clubId, phone, 0);

  const name = rawText.trim();
  if (!name) {
    await sendText(phone, "Please reply with your name to continue.");
    return;
  }

  const [, court] = await Promise.all([findOrCreateContact(phone, name), getCourt(courtId, clubId)]);
  await sendConfirm(clubId, phone, courtId, court.name, date, startTime, endTime ?? "");
}

async function sendConfirm(
  clubId: string,
  phone: string,
  courtId: string,
  courtName: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<void> {
  await setState(clubId, phone, "confirm", { date, courtId, startTime, endTime } satisfies FlowData);

  await sendButtons(
    phone,
    `Confirm this booking?\n🎾 ${courtName}\n📅 ${formatDateTitle(date)}\n🕐 ${startTime}–${endTime}`,
    [
      { id: "confirm:yes", title: "Confirm" },
      { id: "confirm:no", title: "Cancel" },
    ]
  );
}

async function handleConfirmYes(clubId: string, phone: string, state: ConversationState): Promise<void> {
  const { date, courtId, startTime, endTime } = state.data as FlowData;
  if (!date || !courtId || !startTime || !endTime) return sendDatePicker(clubId, phone, 0);

  try {
    await createBookingForCustomer(clubId, courtId, date, startTime, endTime, phone);
  } catch (err: any) {
    if (err?.status === 409) {
      await sendText(phone, "Sorry, that slot was just taken. Let's find another time.");
      const sent = await sendTimeList(clubId, phone, date, courtId);
      if (!sent) {
        await sendText(phone, "That court just filled up for this day. Pick another day.");
        return sendDatePicker(clubId, phone, 0);
      }
      return;
    }
    throw err;
  }

  const court = await getCourt(courtId, clubId);
  await clearState(clubId, phone);
  await sendText(
    phone,
    `✅ You're booked!\n${court.name} · ${formatDateTitle(date)} · ${startTime}–${endTime ?? ""}\nReply "my bookings" anytime to view or cancel.`
  );
}

async function sendMyBookings(clubId: string, phone: string): Promise<void> {
  await clearState(clubId, phone);
  const bookings = await listUpcomingBookingsForCustomer(clubId, phone);

  if (bookings.length === 0) {
    await sendText(phone, 'You don\'t have any upcoming bookings. Reply "book" to make one!');
    return;
  }

  const lines = bookings.map(
    (b, i) => `${numberEmoji(i + 1)} ${b.courtName} · ${formatDateTitle(b.date)} · ${b.startTime}`
  );

  await setState(clubId, phone, "cancel_pick", { bookingIds: bookings.map((b) => b.id) } satisfies FlowData);

  await sendText(
    phone,
    `Your upcoming bookings:\n${lines.join("\n")}\nReply with a number to cancel, or "menu" to book another.`
  );
}

async function handleCancelPick(
  clubId: string,
  phone: string,
  state: ConversationState,
  text: string
): Promise<void> {
  const { bookingIds } = state.data as FlowData;
  const n = Number(text);

  if (!bookingIds?.length || !Number.isInteger(n) || n < 1 || n > bookingIds.length) {
    await clearState(clubId, phone);
    await sendText(phone, 'Sorry, I didn\'t catch that. Reply "menu" to start over.');
    return;
  }

  await cancelBookingForClub(bookingIds[n - 1], clubId);
  await clearState(clubId, phone);
  await sendText(phone, '❌ Booking cancelled. Reply "book" to make a new one.');
}
