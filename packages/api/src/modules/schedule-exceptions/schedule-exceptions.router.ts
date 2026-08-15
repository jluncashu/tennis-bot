import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  listExceptionsController,
  createExceptionController,
  deleteExceptionController,
} from "./schedule-exceptions.controller";

export const scheduleExceptionsRouter = Router();

scheduleExceptionsRouter.use(requireAuth);

scheduleExceptionsRouter.get("/", listExceptionsController);
scheduleExceptionsRouter.post("/", createExceptionController);
scheduleExceptionsRouter.delete("/:id", deleteExceptionController);