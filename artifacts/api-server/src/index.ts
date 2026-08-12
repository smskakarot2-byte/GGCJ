import app from "./app";
import { logger } from "./lib/logger";
import { db, pool, systemUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Determine the path to the frontend build folder
// When running from artifacts/api-server/dist/index.mjs, we need to:
// 1. Go up from dist/ to api-server/ (../)
// 2. Go up from api-server/ to artifacts/ (../)  
// 3. Go up from artifacts/ to workspace root (../)
// 4. Then go to artifacts/gcuf-web/dist/public
const isProduction = process.env.NODE_ENV === "production";
const frontendBuildPath = path.join(__dirname, "../../../artifacts/gcuf-web/dist/public");

// Ensure required tables exist at runtime. This is a lightweight, idempotent fix
// for hosting environments (like Render free tier) where manual CLI migrations
// are not possible. We create only the minimal core tables the app expects on
// startup so the admin seeding and session storage won't fail.
async function ensureSchema(): Promise<void> {
  const sql = `
  CREATE TABLE IF NOT EXISTS departments (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS system_users (
    id serial PRIMARY KEY,
    username text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'professor',
    full_name text NOT NULL DEFAULT '',
    department_id integer REFERENCES departments(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid varchar PRIMARY KEY,
    sess jsonb NOT NULL,
    expire timestamptz NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions (expire);

  CREATE TABLE IF NOT EXISTS users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar UNIQUE,
    first_name varchar,
    last_name varchar,
    profile_image_url varchar,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `;

  try {
    // Run as a single multi-statement query. node-postgres (used by the pool)
    // supports sending multiple statements in one query string when not in
    // prepared statements mode. This keeps startup fast and idempotent.
    await pool.query(sql);
    logger.info("Database schema ensured (CREATE TABLE IF NOT EXISTS executed)");
  } catch (err) {
    // Log and rethrow — failing to ensure schema should stop startup so the
    // platform operator can inspect logs.
    logger.error({ err }, "Failed to ensure DB schema");
    throw err;
  }
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD not set — admin auto-seed skipped. " +
      "Set both env vars if you need to create the initial admin account.",
    );
    return;
  }

  const existing = await db
    .select()
    .from(systemUsersTable)
    .where(eq(systemUsersTable.username, adminEmail.toLowerCase().trim()))
    .limit(1);

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  if (!existing.length) {
    await db.insert(systemUsersTable).values({
      username: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: "admin",
      fullName: "Administrator",
    });
    logger.info("Admin user seeded");
  } else {
    // Always sync password from env var so rotating ADMIN_PASSWORD takes effect on restart
    await db
      .update(systemUsersTable)
      .set({ passwordHash })
      .where(eq(systemUsersTable.username, adminEmail.toLowerCase().trim()));
    logger.info("Admin password synced from env");
  }
}

// Start sequence: ensure schema → seed admin → start server
(async function main() {
  try {
    await ensureSchema();
    await seedAdmin();

    // Serve static frontend files in production (after API routes are set up in app.ts)
    // This allows the Express server to serve both API and UI from the same origin
    if (isProduction) {
      logger.info({ frontendBuildPath }, "Serving static frontend files");
      app.use(express.static(frontendBuildPath));
      
      // Catch-all route for React Router - serves index.html for all non-API routes
      app.get("*", (req, res) => {
        res.sendFile(path.join(frontendBuildPath, "index.html"));
      });
    }

    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  } catch (err) {
    logger.error({ err }, "Startup failed");
    process.exit(1);
  }
})();
