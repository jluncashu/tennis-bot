import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  listRulesController,
  createRuleController,
  updateRuleController,
  deleteRuleController,
} from "./availability-rules.controller";

export const availabilityRulesRouter = Router({ mergeParams: true }); // mergeParams to inherit :courtId from parent

availabilityRulesRouter.use(requireAuth);

availabilityRulesRouter.get("/", listRulesController);
availabilityRulesRouter.post("/", createRuleController);
availabilityRulesRouter.patch("/:id", updateRuleController);
availabilityRulesRouter.delete("/:id", deleteRuleController);