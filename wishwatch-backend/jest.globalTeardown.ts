import fs from "fs";
import path from "path";

/**
 * Runs once after the entire test suite.
 * Removes the test database file to keep the repo clean.
 */
export default async function globalTeardown(): Promise<void> {
  const dbPath = path.join(__dirname, "prisma", "test.db");
  const shmPath = dbPath + "-shm";
  const walPath = dbPath + "-wal";

  for (const p of [dbPath, shmPath, walPath]) {
    try {
      fs.unlinkSync(p);
    } catch {
      // file may not exist — fine
    }
  }
  console.log("\n🧹 Test database removed.\n");
}
