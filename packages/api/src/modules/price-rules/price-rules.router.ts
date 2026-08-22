import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  listRulesController,
  createRuleController,
  updateRuleController,
  deleteRuleController,
} from "./price-rules.controller";

export const priceRulesRouter = Router({ mergeParams: true }); // mergeParams to inherit :courtId from parent

priceRulesRouter.use(requireAuth);

priceRulesRouter.get("/", listRulesController);
priceRulesRouter.post("/", createRuleController);
priceRulesRouter.patch("/:id", updateRuleController);
priceRulesRouter.delete("/:id", deleteRuleController);
