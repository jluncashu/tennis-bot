import { Router } from "express";
import { requireAuth, requireAuthSSE } from "../auth/auth.middleware";
import {
  listBookingsController,
  createBookingController,
  cancelBookingController,
  streamBookingEvents,
  exportBookingsController,
} from "./booking.controller";

export const bookingRouter = Router();

// Registered before the blanket requireAuth below — EventSource can't send
// an Authorization header, so this route authenticates via query token instead.
bookingRouter.get("/events", requireAuthSSE, streamBookingEvents);

bookingRouter.use(requireAuth);

bookingRouter.get("/", listBookingsController);
bookingRouter.get("/export", exportBookingsController);
bookingRouter.post("/", createBookingController);
bookingRouter.delete("/:id", cancelBookingController);
