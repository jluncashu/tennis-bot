import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  listCourtsController,
  getCourtController,
  createCourtController,
  updateCourtController,
  deleteCourtController,
} from "./courts.controller";
import { availabilityRulesRouter } from "../availability-rules/availability-rules.router";

export const courtsRouter = Router();

courtsRouter.use(requireAuth); // every route below requires a logged-in club

courtsRouter.get("/", listCourtsController);
courtsRouter.get("/:id", getCourtController);
courtsRouter.post("/", createCourtController);
courtsRouter.patch("/:id", updateCourtController);
courtsRouter.delete("/:id", deleteCourtController);
courtsRouter.use("/:courtId/availability-rules", availabilityRulesRouter);