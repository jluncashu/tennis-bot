import express from "express";
import cors from "cors";
import { whatsappRouter } from "./routes/whatsapp.routes";
import { reservationsRouter } from "./modules/reservations/reservations.router";
import { settingsRouter } from "./modules/settings/settings.router";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.router";

export const app = express();

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());
app.use("/", whatsappRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/auth", authRouter);
