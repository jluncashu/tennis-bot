import { z } from "zod";

export interface CourtSettings {
  openHour: number;
  closeHour: number;
  slotDurationMinutes: number;
  courts: string[];
  pricePerSlotRON: number;
}

export const updateSettingsSchema = z
  .object({
    openHour: z.number().int().min(0).max(24),
    closeHour: z.number().int().min(0).max(24),
    slotDurationMinutes: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
    courts: z.array(z.string().trim().min(1)).min(1),
    pricePerSlotRON: z.number().min(0),
  })
  .partial()
  .refine(
    (data) => data.openHour === undefined || data.closeHour === undefined || data.openHour < data.closeHour,
    { message: "openHour must be before closeHour", path: ["openHour"] }
  );

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
