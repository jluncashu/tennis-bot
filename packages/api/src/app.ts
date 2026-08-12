import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.router";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./shared/middleware/error.middleware";

export const app = express();

app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use("/auth", authRouter);

// Must be last
app.use(errorMiddleware);

