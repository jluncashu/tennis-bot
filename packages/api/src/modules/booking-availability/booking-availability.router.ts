import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { debugAvailabilityController, searchAvailabilityController } from "./booking-availability.controller";

export const bookingAvailabilityRouter = Router();

bookingAvailabilityRouter.use(requireAuth);

bookingAvailabilityRouter.get("/search", searchAvailabilityController);
bookingAvailabilityRouter.get("/:courtId/:date", debugAvailabilityController);
