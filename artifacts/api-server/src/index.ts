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
  const adminEmail = "smskakarot@gmail.com";
  const existing = await db
    .select()
    .from(systemUsersTable)
    .where(eq(systemUsersTable.username, adminEmail))
    .limit(1);

  if (!existing.length) {
    const passwordHash = await bcrypt.hash("GCUF2025", 10);
    await db.insert(systemUsersTable).values({
      username: adminEmail,
      passwordHash,
      role: "admin",
      fullName: "Administrator",
    });
    logger.info("Admin user seeded");
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
