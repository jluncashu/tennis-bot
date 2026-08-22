import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM, 24h

export const searchAvailabilityQuerySchema = z.object({
  // Comma-separated day-of-week numbers (0=Sun..6=Sat), e.g. "1,3,5". Absent
  // or empty = every day.
  daysOfWeek: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map(Number).filter((n) => n >= 0 && n <= 6) : [])),
  startTime: z.string().regex(timeRegex, "Expected HH:MM"),
  durationMinutes: z.coerce.number().int().positive(),
  courtType: z.enum(["any", "covered", "uncovered"]).default("any"),
  courtId: z.string().uuid().optional(),
});

export type SearchAvailabilityQuery = z.infer<typeof searchAvailabilityQuerySchema>;
