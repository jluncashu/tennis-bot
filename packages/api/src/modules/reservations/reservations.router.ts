import { Router } from "express";
import { listReservationsController } from "./reservations.controller";

export const reservationsRouter = Router();

reservationsRouter.get("/", listReservationsController);
