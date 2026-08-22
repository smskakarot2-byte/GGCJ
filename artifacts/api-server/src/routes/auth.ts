import { Router, type IRouter, type Request, type Response } from "express";
import { db, systemUsersTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  clearSession,
  createSession,
  getSessionId,
  SESSION_COOKIE,
  SESSION_TTL,
} from "../lib/auth";

const router: IRouter = Router();

// ── Auth-specific rate limit: 5 attempts per 15 minutes per email or IP ───────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  keyGenerator: (req) => {
    const email = (req.body?.email as string | undefined)?.toLowerCase().trim();
    return email ? `login:${email}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
});

// ── In-memory account lockout tracker ─────────────────────────────────────────
// For multi-instance deployments, replace with Redis or a DB-backed store.
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function recordFailure(key: string): void {
  const rec = failedAttempts.get(key) ?? { count: 0, lockUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockUntil = Date.now() + LOCKOUT_MS;
  }
  failedAttempts.set(key, rec);
}

function isLocked(key: string): { locked: boolean; waitMin: number } {
  const rec = failedAttempts.get(key);
  if (!rec || Date.now() >= rec.lockUntil) return { locked: false, waitMin: 0 };
  return {
    locked: true,
    waitMin: Math.ceil((rec.lockUntil - Date.now()) / 60_000),
  };
}

function clearFailures(key: string): void {
  failedAttempts.delete(key);
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setSessionCookie(res: Response, sid: string) {
  const isDev = process.env.NODE_ENV !== "production";
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: !isDev, // Only use secure cookies in production (HTTPS)
    sameSite: isDev ? "lax" : "strict",
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

// ── Routes ────────────────────────────────────────────────────────────────────
router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.user) { res.json({ user: null }); return; }
  const user = await buildUserPayload(req.user.id);
  res.json({ user });
});

router.post("/auth/login", loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const { email, password } = parsed.data;
  const lockKey = email.toLowerCase().trim();

  // Check account lockout
  const { locked, waitMin } = isLocked(lockKey);
  if (locked) {
    res.status(429).json({
      error: `Account temporarily locked. Try again in ${waitMin} minute(s).`,
    });
    return;
  }

  const [sysUser] = await db
    .select()
    .from(systemUsersTable)
    .where(eq(systemUsersTable.username, lockKey))
    .limit(1);

  if (!sysUser) {
    recordFailure(lockKey);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, sysUser.passwordHash);
  if (!valid) {
    recordFailure(lockKey);
    const remaining = MAX_ATTEMPTS - (failedAttempts.get(lockKey)?.count ?? 0);
    const hint = remaining > 0 ? ` (${remaining} attempt(s) remaining)` : " — account is now locked for 15 minutes";
    res.status(401).json({ error: `Invalid email or password${hint}` });
    return;
  }

  // Successful login — clear failure record
  clearFailures(lockKey);

  const sessionUser = {
    id: sysUser.id,
    username: sysUser.username,
    role: sysUser.role,
    fullName: sysUser.fullName,
    departmentId: sysUser.departmentId ?? null,
  };

  const sid = await createSession({ user: sessionUser });
  setSessionCookie(res, sid);
  const freshUser = await buildUserPayload(sysUser.id);
  res.json({ user: freshUser });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ ok: true });
});

export default router;
