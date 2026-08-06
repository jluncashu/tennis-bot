import { getWeekDates, getSlotsForDate, getFieldsForSlot, buildSummary } from "./booking.service";

export const FLOW_SCREENS = {
  DATE_SELECT: "DATE_SELECT",
  SLOT_SELECT: "SLOT_SELECT",
  FIELD_SELECT: "FIELD_SELECT",
  CONFIRM: "CONFIRM",
} as const;

interface FlowRequest {
  version: string;
  action: "ping" | "INIT" | "data_exchange" | "BACK";
  screen?: string;
  data?: Record<string, any>;
  flow_token?: string;
}

// Handles every call WhatsApp makes to the Flow's data-exchange endpoint:
// health checks, the initial screen, and each screen-to-screen transition.
// Only ids cross the wire to/from the client; human-readable titles are
// always re-derived server-side (see booking.service.ts) since a
// RadioButtonsGroup only ever reports back the selected id.
export function routeFlowAction(req: FlowRequest): Record<string, unknown> {
  if (req.action === "ping") {
    return { version: req.version, data: { status: "active" } };
  }

  if (req.action === "INIT") {
    const { dates, weekOffset } = getWeekDates(0);
    return {
      version: req.version,
      screen: FLOW_SCREENS.DATE_SELECT,
      data: { dates, week_offset: weekOffset },
    };
  }

  const screen = req.screen;
  const data = req.data ?? {};

  if (screen === FLOW_SCREENS.DATE_SELECT) {
    if (data.nav === "next" || data.nav === "prev") {
      const currentOffset = Number(data.week_offset ?? 0);
      const nextOffset = data.nav === "next" ? currentOffset + 1 : Math.max(0, currentOffset - 1);
      const { dates, weekOffset } = getWeekDates(nextOffset);
      return {
        version: req.version,
        screen: FLOW_SCREENS.DATE_SELECT,
        data: { dates, week_offset: weekOffset },
      };
    }

    const dateId = data.date_id as string;
    const { slots } = getSlotsForDate(dateId);
    return {
      version: req.version,
      screen: FLOW_SCREENS.SLOT_SELECT,
      data: { slots, date_id: dateId },
    };
  }

  if (screen === FLOW_SCREENS.SLOT_SELECT) {
    const dateId = data.date_id as string;
    const slotId = data.slot_id as string;
    const { fields } = getFieldsForSlot(slotId);
    return {
      version: req.version,
      screen: FLOW_SCREENS.FIELD_SELECT,
      data: { fields, date_id: dateId, slot_id: slotId },
    };
  }

  if (screen === FLOW_SCREENS.FIELD_SELECT) {
    const dateId = data.date_id as string;
    const slotId = data.slot_id as string;
    const fieldId = data.field_id as string;
    return {
      version: req.version,
      screen: FLOW_SCREENS.CONFIRM,
      data: {
        date_id: dateId,
        slot_id: slotId,
        field_id: fieldId,
        summary: buildSummary(dateId, slotId, fieldId),
      },
    };
  }

  throw new Error(`Unhandled WhatsApp Flow screen: ${screen}`);
}
