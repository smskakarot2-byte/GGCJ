import { Router, type IRouter, type Request, type Response } from "express";
import { db, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const nameSchema = z.object({ name: z.string().min(1).max(200) });

// GET /departments
router.get("/departments", async (req: Request, res: Response) => {
  const rows = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  res.json(rows);
});

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return false; }
  if ((req.user as { role: string }).role !== "admin") { res.status(403).json({ error: "Forbidden" }); return false; }
  return true;
}

// POST /departments  (admin only)
router.post("/departments", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid name" }); return; }
  const [row] = await db.insert(departmentsTable).values({ name: parsed.data.name }).returning();
  res.status(201).json(row);
});

// PATCH /departments/:id  (admin only)
router.patch("/departments/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid name" }); return; }
  const [row] = await db.update(departmentsTable).set({ name: parsed.data.name }).where(eq(departmentsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// DELETE /departments/:id  (admin only)
router.delete("/departments/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  res.status(204).send();
});

export default router;
