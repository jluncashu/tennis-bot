import { Request, Response } from "express";
import { listExceptions, addException, removeException } from "./schedule-exceptions.service";
import { createExceptionSchema } from "./schedule-exceptions.schema";

export async function listExceptionsController(req: Request, res: Response) {
  const exceptions = await listExceptions(req.user!.id);
  res.json(exceptions);
}

export async function createExceptionController(req: Request, res: Response) {
  const parsed = createExceptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const exception = await addException(req.user!.id, parsed.data);
  res.status(201).json(exception);
}

export async function deleteExceptionController(req: Request, res: Response) {
  await removeException(req.params.id as string, req.user!.id);
  res.sendStatus(204);
}