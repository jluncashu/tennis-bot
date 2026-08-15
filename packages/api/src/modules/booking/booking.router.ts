import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { listBookingsController, cancelBookingController } from "./booking.controller";

export const bookingRouter = Router();

bookingRouter.use(requireAuth);

bookingRouter.get("/", listBookingsController);
bookingRouter.delete("/:id", cancelBookingController);
