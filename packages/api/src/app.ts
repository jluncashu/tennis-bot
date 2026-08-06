import express from "express";
import { whatsappRouter } from "./routes/whatsapp.routes";

export const app = express();

app.use(express.json());
app.use("/", whatsappRouter);

app.get("/", (_req, res) => {
  res.send("Tennis WhatsApp bot is running.");
});