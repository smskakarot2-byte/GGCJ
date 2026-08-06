import app from "./app";
import { logger } from "./lib/logger";
import { db, systemUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
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

seedAdmin()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to seed admin");
    process.exit(1);
  });
