import { z } from "zod";

export const registerSchema = z.object({
  name:     z.string().min(1).max(255),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  role:     z.enum(["owner", "staff"]).default("staff"),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody    = z.infer<typeof loginSchema>;
export type RefreshBody  = z.infer<typeof refreshSchema>;