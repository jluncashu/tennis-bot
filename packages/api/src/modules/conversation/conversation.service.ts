import { sendList, sendButtons, sendText } from "../../services/whatsapp.service";
import { findOrCreateContact } from "../contacts/contacts.service";
import { getState, setState, clearState } from "../conversation-state/conversation-state.repository";
import type { ConversationState } from "../conversation-state/conversation-state.schema";
import { getAvailableDates, getAvailableSlots } from "../booking-availability/booking-availability.service";
import { listCourts, getCourt } from "../courts/courts.service";
import { createBookingForCustomer } from "../booking/booking.service";

const RESET_TRIGGERS = ["hi", "hello", "book", "menu"];

interface IncomingMessage {
  text?: string;
  buttonId?: string;
}

type FlowData = { date?: string; courtId?: string; startTime?: string };

function formatDateTitle(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
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

  const text = message.text?.trim().toLowerCase();
  const state = await getState(clubId, phone);

  if (!state || (text && RESET_TRIGGERS.includes(text))) {
    return sendDatePicker(clubId, phone, 0);
  }

  await sendText(phone, 'Please pick an option from the list above, or type "menu" to start over.');
}

async function handleReply(clubId: string, phone: string, replyId: string): Promise<void> {
  const state = await getState(clubId, phone);

  const navMatch = replyId.match(/^nav:week:(-?\d+)$/);
  if (navMatch) {
    return sendDatePicker(clubId, phone, Number(navMatch[1]));
  }

  if (replyId.startsWith("date:")) {
    return handleDateChosen(clubId, phone, replyId.slice("date:".length));
  }

  if (replyId.startsWith("court:") && state?.step === "choose_court") {
    return handleCourtChosen(clubId, phone, state, replyId.slice("court:".length));
  }

  if (replyId.startsWith("time:") && state?.step === "choose_time") {
    return handleTimeChosen(clubId, phone, state, replyId.slice("time:".length));
  }

  if (replyId === "confirm:yes" && state?.step === "confirm") {
    return handleConfirmYes(clubId, phone, state);
  }

  if (replyId === "confirm:no" && state?.step === "confirm") {
    await clearState(clubId, phone);
    await sendText(phone, 'No problem, booking cancelled. Send "menu" any time to start again.');
    return;
  }

  await sendText(phone, 'That option is no longer valid — send "menu" to start over.');
}

async function sendDatePicker(clubId: string, phone: string, weekOffset: number): Promise<void> {
  const effectiveOffset = Math.max(weekOffset, 0);
  const days = await getAvailableDates(clubId, effectiveOffset);

  await setState(clubId, phone, "choose_date", {});

  const rows = days.map((d) => ({
    id: `date:${d.date}`,
    title: `${formatDateTitle(d.date)}${d.hasAvailability ? "" : " (full)"}`,
  }));

  const navRows = [];
  if (effectiveOffset > 0) navRows.push({ id: `nav:week:${effectiveOffset - 1}`, title: "◀ Previous week" });
  navRows.push({ id: `nav:week:${effectiveOffset + 1}`, title: "Next week ▶" });

  await sendList(phone, "Which day would you like to book?", "Pick a day", [
    { title: "Days", rows },
    { title: "Navigate", rows: navRows },
  ]);
}

async function handleDateChosen(clubId: string, phone: string, date: string): Promise<void> {
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

  if (courtsWithAvailability.length <= 3) {
    await sendButtons(
      phone,
      `Which court for ${formatDateTitle(date)}?`,
      courtsWithAvailability.map((c) => ({ id: `court:${c.id}`, title: c.name.slice(0, 20) }))
    );
  } else {
    await sendList(phone, `Which court for ${formatDateTitle(date)}?`, "Pick a court", [
      { title: "Courts", rows: courtsWithAvailability.map((c) => ({ id: `court:${c.id}`, title: c.name })) },
    ]);
  }
}

async function handleCourtChosen(
  clubId: string,
  phone: string,
  state: ConversationState,
  courtId: string
): Promise<void> {
  const { date } = state.data as FlowData;
  if (!date) return sendDatePicker(clubId, phone, 0);

  const slots = await getAvailableSlots(clubId, courtId, date);
  if (slots.length === 0) {
    await sendText(phone, "That court just filled up for this day. Pick another day.");
    return sendDatePicker(clubId, phone, 0);
  }

  await setState(clubId, phone, "choose_time", { date, courtId } satisfies FlowData);

  await sendList(phone, `Which time on ${formatDateTitle(date)}?`, "Pick a time", [
    {
      title: "Available times",
      rows: slots.map((s) => ({ id: `time:${s.startTime}`, title: `${s.startTime} - ${s.endTime}` })),
    },
  ]);
}

async function handleTimeChosen(
  clubId: string,
  phone: string,
  state: ConversationState,
  startTime: string
): Promise<void> {
  const { date, courtId } = state.data as FlowData;
  if (!date || !courtId) return sendDatePicker(clubId, phone, 0);

  const court = await getCourt(courtId, clubId);

  await setState(clubId, phone, "confirm", { date, courtId, startTime } satisfies FlowData);

  await sendButtons(phone, `Confirm booking: ${court.name} on ${formatDateTitle(date)} at ${startTime}?`, [
    { id: "confirm:yes", title: "Yes, book it" },
    { id: "confirm:no", title: "No, cancel" },
  ]);
}

async function handleConfirmYes(clubId: string, phone: string, state: ConversationState): Promise<void> {
  const { date, courtId, startTime } = state.data as FlowData;
  if (!date || !courtId || !startTime) return sendDatePicker(clubId, phone, 0);

  try {
    await createBookingForCustomer(clubId, courtId, date, startTime, phone);
  } catch (err: any) {
    if (err?.status === 409) {
      await sendText(phone, "Sorry, that slot was just taken. Here are the current times:");
      return handleCourtChosen(clubId, phone, state, courtId); // sends back to choose_time with a refreshed list
    }
    throw err;
  }

  await clearState(clubId, phone);
  await sendText(phone, `Booked! ${formatDateTitle(date)} at ${startTime}. See you on the court! 🎾`);
}
