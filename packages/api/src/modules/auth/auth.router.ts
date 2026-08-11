import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  getMeController,
} from "./auth.controller";
import { requireAuth } from "./auth.middleware";

export const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login",    loginController);
authRouter.post("/refresh",  refreshController);
authRouter.post("/logout",   logoutController);
authRouter.get("/me",        requireAuth, getMeController);