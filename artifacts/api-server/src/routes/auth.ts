import { Router, type IRouter, type Request, type Response } from "express";
import { db, systemUsersTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  clearSession,
  createSession,
  getSessionId,
  SESSION_COOKIE,
  SESSION_TTL,
} from "../lib/auth";

const router: IRouter = Router();

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

async function buildUserPayload(userId: number) {
  const [row] = await db
    .select({
      id: systemUsersTable.id,
      username: systemUsersTable.username,
      role: systemUsersTable.role,
      fullName: systemUsersTable.fullName,
      departmentId: systemUsersTable.departmentId,
      departmentName: departmentsTable.name,
    })
    .from(systemUsersTable)
    .leftJoin(departmentsTable, eq(departmentsTable.id, systemUsersTable.departmentId))
    .where(eq(systemUsersTable.id, userId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    fullName: row.fullName,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
  };
}

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.user) { res.json({ user: null }); return; }
  const user = await buildUserPayload(req.user.id);
  res.json({ user });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const { email, password } = parsed.data;

  const [sysUser] = await db
    .select()
    .from(systemUsersTable)
    .where(eq(systemUsersTable.username, email.toLowerCase().trim()))
    .limit(1);

  if (!sysUser) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, sysUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionUser = {
    id: sysUser.id,
    username: sysUser.username,
    role: sysUser.role,
    fullName: sysUser.fullName,
    departmentId: sysUser.departmentId ?? null,
  };

  const sid = await createSession({ user: sessionUser });
  setSessionCookie(res, sid);
  // Return fresh payload (with departmentName) so the client has it immediately
  const freshUser = await buildUserPayload(sysUser.id);
  res.json({ user: freshUser });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ ok: true });
});

export default router;
