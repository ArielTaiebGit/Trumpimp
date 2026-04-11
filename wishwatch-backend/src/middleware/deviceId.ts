import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Middleware: resolve or create a User from the x-device-id header.
 * In v1, each device is its own user — no auth required.
 */
export async function deviceIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const deviceId = (req.headers["x-device-id"] as string) || "default-device";

  let user = await prisma.user.findUnique({ where: { deviceId } });
  if (!user) {
    user = await prisma.user.create({
      data: { deviceId },
    });
  }

  req.userId = user.id;
  next();
}
