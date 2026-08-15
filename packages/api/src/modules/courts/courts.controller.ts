import { Request, Response } from "express";
import { listCourts, getCourt, addCourt, editCourt, removeCourt } from "./courts.service";
import { createCourtSchema, updateCourtSchema } from "./courts.schema";

export async function listCourtsController(req: Request, res: Response) {
  const courts = await listCourts(req.user!.id);
  res.json(courts);
}

export async function getCourtController(req: Request, res: Response) {
  const court = await getCourt(req.params.id as string, req.user!.id);
  res.json(court);
}

export async function createCourtController(req: Request, res: Response) {
  const parsed = createCourtSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const court = await addCourt(req.user!.id, parsed.data);
  res.status(201).json(court);
}

export async function updateCourtController(req: Request, res: Response) {
  const parsed = updateCourtSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const court = await editCourt(req.params.id as string, req.user!.id, parsed.data);
  res.json(court);
}

export async function deleteCourtController(req: Request, res: Response) {
  await removeCourt(req.params.id as string, req.user!.id);
  res.sendStatus(204);
}