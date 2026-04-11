import { Router } from "express";
import { Expo } from "expo-server-sdk";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import type { Request, Response } from "express";

export const notificationsRouter = Router();

/** POST /api/notifications/register — store Expo push token for this device */
notificationsRouter.post("/register", async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token || !Expo.isExpoPushToken(token)) {
    res.status(400).json({ error: "Invalid or missing Expo push token" });
    return;
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { pushToken: token },
  });

  logger.info(`Push token registered for user ${req.userId}`);
  res.json({ success: true });
});
