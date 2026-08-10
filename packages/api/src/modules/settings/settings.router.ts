import { Router } from "express";
import { getSettingsController, updateSettingsController } from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.get("/", getSettingsController);
settingsRouter.put("/", updateSettingsController);
