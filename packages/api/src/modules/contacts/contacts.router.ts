import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { listContactsController, listContactBookingsController } from "./contacts.controller";

export const contactsRouter = Router();

contactsRouter.use(requireAuth); // every route below requires a logged-in club

contactsRouter.get("/", listContactsController);
contactsRouter.get("/:id/bookings", listContactBookingsController);
