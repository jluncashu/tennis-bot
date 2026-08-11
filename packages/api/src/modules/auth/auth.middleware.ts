import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { httpError } from "../../shared/http-error";

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(httpError(401, "Missing or malformed Authorization header"));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    if (payload.type !== "access") {
      return next(httpError(401, "Invalid token type"));
    }

    req.user = { id: payload.sub };
    next();
  } catch {
    next(httpError(401, "Invalid or expired token"));
  }
}