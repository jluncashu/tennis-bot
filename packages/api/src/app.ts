import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.router";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./shared/middleware/error.middleware";
import { courtsRouter } from "./modules/courts/courts.router";
import { scheduleExceptionsRouter } from "./modules/schedule-exceptions/schedule-exceptions.router";
import { bookingRouter } from "./modules/booking/booking.router";
import { bookingAvailabilityRouter } from "./modules/booking-availability/booking-availability.router";
import { whatsappRouter } from "./routes/whatsapp.routes";

export const app = express();

app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use("/auth", authRouter);
app.use("/courts", courtsRouter);
app.use("/schedule-exceptions", scheduleExceptionsRouter);
app.use("/bookings", bookingRouter);
app.use("/debug/availability", bookingAvailabilityRouter);
app.use(whatsappRouter);

app.use(errorMiddleware);

