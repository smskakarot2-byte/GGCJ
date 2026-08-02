import { Router, type IRouter, type Request, type Response } from "express";
import { db, systemUsersTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const STRONG_PASSWORD = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const createUserSchema = z.object({
  username: z.string().min(2).max(80),
  password: STRONG_PASSWORD,
  fullName: z.string().min(1).max(200).default(""),
  role: z.enum(["admin", "professor"]).default("professor"),
  departmentId: z.number().int().nullable().optional(),
}).refine(
  (data) => data.role !== "professor" || (data.departmentId != null),
  { message: "Professors must be assigned a department", path: ["departmentId"] }
);

const updateUserSchema = z.object({
  role: z.enum(["admin", "professor"]),
  departmentId: z.number().int().nullable().optional(),
}).refine(
  (data) => data.role !== "professor" || (data.departmentId != null),
  { message: "Professors must be assigned a department", path: ["departmentId"] }
);

router.get("/users/me/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [sysUser] = await db
    .select({
      id: systemUsersTable.id,
      username: systemUsersTable.username,
      fullName: systemUsersTable.fullName,
      role: systemUsersTable.role,
      departmentId: systemUsersTable.departmentId,
      departmentName: departmentsTable.name,
    })
    .from(systemUsersTable)
    .leftJoin(departmentsTable, eq(systemUsersTable.departmentId, departmentsTable.id))
    .where(eq(systemUsersTable.id, req.user.id))
    .limit(1);

  if (!sysUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(sysUser);
});

router.get("/users", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const rows = await db
    .select({
      id: systemUsersTable.id,
      username: systemUsersTable.username,
      fullName: systemUsersTable.fullName,
      role: systemUsersTable.role,
      departmentId: systemUsersTable.departmentId,
      departmentName: departmentsTable.name,
      createdAt: systemUsersTable.createdAt,
    })
    .from(systemUsersTable)
    .leftJoin(departmentsTable, eq(systemUsersTable.departmentId, departmentsTable.id))
    .orderBy(systemUsersTable.createdAt);

  res.json(rows);
});

router.post("/users", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }

  const { username, password, fullName, role, departmentId } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [row] = await db
      .insert(systemUsersTable)
      .values({ username: username.toLowerCase().trim(), passwordHash, fullName, role, departmentId: departmentId ?? null })
      .returning();
    res.status(201).json({ id: row.id, username: row.username, fullName: row.fullName, role: row.role, departmentId: row.departmentId });
  } catch {
    res.status(409).json({ error: "Username already exists" });
  }
});

// PATCH /users/:id — update role (and optionally departmentId)
router.patch("/users/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Admins cannot change their own role
  if (id === req.user.id) {
    res.status(403).json({ error: "You cannot change your own role" });
    return;
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }

  const { role, departmentId } = parsed.data;

  // When promoting to admin, clear department unless explicitly set
  const newDeptId = role === "admin"
    ? (departmentId !== undefined ? departmentId : null)
    : (departmentId ?? null);

  const [updated] = await db
    .update(systemUsersTable)
    .set({ role, departmentId: newDeptId })
    .where(eq(systemUsersTable.id, id))
    .returning({
      id: systemUsersTable.id,
      username: systemUsersTable.username,
      fullName: systemUsersTable.fullName,
      role: systemUsersTable.role,
      departmentId: systemUsersTable.departmentId,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

router.delete("/users/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Prevent self-deletion
  if (id === req.user.id) {
    res.status(403).json({ error: "You cannot delete your own account" });
    return;
  }

  await db.delete(systemUsersTable).where(eq(systemUsersTable.id, id));
  res.status(204).send();
});

export default router;
