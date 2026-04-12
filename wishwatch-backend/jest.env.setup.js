/**
 * Runs in every Jest worker BEFORE any module is imported.
 * Sets DATABASE_URL so that src/db.ts creates a PrismaClient
 * pointing at the isolated test database instead of the dev database.
 */
process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.NODE_ENV = "test";
