import { Router } from "express";
import { verifyWebhook, receiveMessage } from "./whatsapp.controller";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", verifyWebhook);
whatsappRouter.post("/webhook", receiveMessage);
