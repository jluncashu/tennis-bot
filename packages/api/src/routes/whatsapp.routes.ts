import { Router } from "express";
import { verifyWebhook, receiveMessage } from "../controllers/whatsapp.controller";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", verifyWebhook);
whatsappRouter.post("/webhook", receiveMessage);