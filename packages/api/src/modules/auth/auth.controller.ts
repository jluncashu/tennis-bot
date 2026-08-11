import { Request, Response } from "express";
import { register, login, refresh, getMe } from "./auth.service";
import { registerSchema, loginSchema } from "./auth.schema";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, COOKIE_OPTIONS);
}

// POST /auth/register
export async function registerController(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { refreshToken, accessToken, club } = await register(parsed.data);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ accessToken, club });
}

// POST /auth/login
export async function loginController(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { refreshToken, accessToken, club } = await login(parsed.data);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, club });
}

// POST /auth/refresh
export async function refreshController(req: Request, res: Response) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  const { refreshToken, accessToken, club } = await refresh(token);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, club });
}

// POST /auth/logout
export async function logoutController(_req: Request, res: Response) {
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.json({ ok: true });
}

// GET /auth/me
export async function getMeController(req: Request, res: Response) {
  const result = await getMe(req.user!.id);
  res.json(result);
}