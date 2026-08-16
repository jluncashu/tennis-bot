import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { listBookingsController, createBookingController, cancelBookingController } from "./booking.controller";

export const bookingRouter = Router();

bookingRouter.use(requireAuth);

bookingRouter.get("/", listBookingsController);
bookingRouter.post("/", createBookingController);
bookingRouter.delete("/:id", cancelBookingController);
