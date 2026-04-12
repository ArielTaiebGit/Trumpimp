import { execSync } from "child_process";
import path from "path";

/**
 * Runs once before the entire test suite (separate process).
 * Creates the test SQLite database with the current Prisma schema.
 */
export default async function globalSetup(): Promise<void> {
  const cwd = path.join(__dirname);
  const env = { ...process.env, DATABASE_URL: "file:./prisma/test.db" };

  console.log("\n🧪 Setting up test database (prisma/test.db)...");

  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", {
    cwd,
    env,
    stdio: "pipe",
  });

  console.log("✅ Test database ready.\n");
}
