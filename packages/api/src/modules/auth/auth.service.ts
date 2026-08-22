import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { httpError } from "../../shared/http-error";
import { createClub, findClubByEmail, findClubById } from "./auth.repository";
import { LoginBody, RegisterBody } from "./auth.schema";

type TokenPayload = {
  sub: string;
  email: string;
  type: "access" | "refresh";
};

export function signAccessToken(id: string, email: string): string {
  return jwt.sign({ sub: id, email, type: "access" }, env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(id: string, email: string): string {
  return jwt.sign({ sub: id, email, type: "refresh" }, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw httpError(401, "Invalid or expired token");
  }
}


export async function register({ name, email, password }: RegisterBody) {
  const existing = await findClubByEmail(email);
  if (existing) throw httpError(409, "Email already in use");

  const passwordHash = await argon2.hash(password);
  const club = await createClub({ name, email, passwordHash });

  return {
    accessToken:  signAccessToken(club.id, club.email),
    refreshToken: signRefreshToken(club.id, club.email),
    club: {
      id:                         club.id,
      name:                       club.name,
      email:                      club.email,
      defaultSlotDurationMinutes: club.defaultSlotDurationMinutes,
      defaultPriceRon:            club.defaultPriceRon,
    },
  };
}

export async function login({ email, password }: LoginBody) {
  const club = await findClubByEmail(email);

  const hash = club?.passwordHash ?? await argon2.hash("dummy");
  const valid = await argon2.verify(hash, password);

  if (!club || !valid) throw httpError(401, "Invalid email or password");

  return {
    accessToken:  signAccessToken(club.id, club.email),
    refreshToken: signRefreshToken(club.id, club.email),
    club: {
      id:                         club.id,
      name:                       club.name,
      email:                      club.email,
      defaultSlotDurationMinutes: club.defaultSlotDurationMinutes,
      defaultPriceRon:            club.defaultPriceRon,
    },
  };
}

export async function refresh(token: string) {
  const payload = verifyToken(token);
  if (payload.type !== "refresh") throw httpError(401, "Invalid token type");

  const club = await findClubById(payload.sub);
  if (!club) throw httpError(401, "Club not found");

  return {
    accessToken:  signAccessToken(club.id, club.email),
    refreshToken: signRefreshToken(club.id, club.email),
    club: {
      id:                         club.id,
      name:                       club.name,
      email:                      club.email,
      defaultSlotDurationMinutes: club.defaultSlotDurationMinutes,
      defaultPriceRon:            club.defaultPriceRon,
    },
  };
}

export async function getMe(clubId: string) {
  const club = await findClubById(clubId);
  if (!club) throw httpError(404, "Club not found");

  return {
    id:        club.id,
    name:      club.name,
    email:     club.email,
    createdAt: club.createdAt,
  };
}