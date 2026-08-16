import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { httpError } from "../../shared/http-error";

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: string;
}

function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(httpError(401, "Missing or malformed Authorization header"));
  }

  try {
    req.user = { id: verifyAccessToken(authHeader.slice(7)).sub };
    next();
  } catch {
    next(httpError(401, "Invalid or expired token"));
  }
}

// EventSource (used for the dashboard's live-updates stream) can't set
// custom headers, so the access token travels as a query param instead. The
// short-lived (15m) access token keeps the exposure window small.
export function requireAuthSSE(req: Request, _res: Response, next: NextFunction) {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;

  if (!token) {
    return next(httpError(401, "Missing token"));
  }

  try {
    req.user = { id: verifyAccessToken(token).sub };
    next();
  } catch {
    next(httpError(401, "Invalid or expired token"));
  }
}