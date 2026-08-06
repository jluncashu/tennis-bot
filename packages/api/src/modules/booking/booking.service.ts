import {
  mockDatesForWeek,
  mockSlotsForDate,
  mockFieldsForSlot,
  formatDateTitle,
  formatSlotTitle,
  formatFieldTitle,
} from "./booking.repository";

export function getWeekDates(weekOffset: number) {
  return { dates: mockDatesForWeek(weekOffset), weekOffset };
}

export function getSlotsForDate(dateId: string) {
  return { slots: mockSlotsForDate(dateId) };
}

export function getFieldsForSlot(slotId: string) {
  return { fields: mockFieldsForSlot(slotId) };
}

export function buildSummary(dateId: string, slotId: string, fieldId: string): string {
  return `${formatDateTitle(dateId)} · ${formatSlotTitle(slotId)} · ${formatFieldTitle(fieldId)}`;
}

export { formatDateTitle, formatSlotTitle, formatFieldTitle };
