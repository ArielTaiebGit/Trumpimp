import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import { connectDb, disconnectDb } from "./db";
import { closeBrowser } from "./scrapers/browser";
import { deviceIdMiddleware } from "./middleware/deviceId";
import { itemsRouter } from "./routes/items";
import { dealsRouter } from "./routes/deals";
import { scrapeRouter } from "./routes/scrape";
import { statsRouter } from "./routes/stats";
import { notificationsRouter } from "./routes/notifications";
import { startDailyScanJob } from "./jobs/scheduler";
import { logger } from "./utils/logger";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ─── Security & parsing ───────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: "*", // tighten in production
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down." },
  })
);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Device-ID auth middleware (applied to all /api/* routes below) ───────────
app.use("/api", deviceIdMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/items", itemsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/stats", statsRouter);
app.use("/api/notifications", notificationsRouter);

// ─── 404 fallback ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error("Unhandled error", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────
const HOST = "0.0.0.0"; // listen on all interfaces — reachable via localhost and LAN IP

async function main() {
  await connectDb();
  logger.info("Database connected");

  app.listen(PORT, HOST, () => {
    logger.info(`WishWatch backend running on http://localhost:${PORT}`);
  });
  });

  startDailyScanJob();
}

main().catch(async (err) => {
  logger.error("Fatal startup error", err);
  await disconnectDb();
  process.exit(1);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await closeBrowser();
  await disconnectDb();
  process.exit(0);
});
