import { Router } from "express";
import { verifyWebhook, receiveMessage } from "../controllers/whatsapp.controller";
import { handleFlowDataExchange } from "../controllers/whatsapp-flow.controller";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", verifyWebhook);
whatsappRouter.post("/webhook", receiveMessage);
whatsappRouter.post("/flow", handleFlowDataExchange);