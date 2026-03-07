import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { ApiKey, hashKey } from "../models/ApiKey";
import { User, IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
}

// Authenticate via JWT session cookie OR X-API-Key header.
// Sets req.user on success, calls next(). Responds 401 on failure.
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Try API key header first (for external developer access)
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
    if (apiKeyHeader) {
      const hash = hashKey(apiKeyHeader);
      const keyDoc = await ApiKey.findOne({ keyHash: hash });
      if (!keyDoc) {
        res.status(401).json({ error: "Invalid API key" });
        return;
      }
      console.log(`Authenticated API key for user ${keyDoc.userId}`);
      const user = await User.findById(keyDoc.userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      console.log(`API key belongs to user ${user.email}`);
      // Update last used time asynchronously — don't await to keep latency low
      ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() }).exec();
      req.user = user;
      console.log(`API key authentication successful for user ${user.email}`);
      return next();
    }

    // 2. Try JWT session cookie (for web frontend)
    const token = req.cookies?.token as string | undefined;
    if (token) {
      console.log("here");
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      const user = await User.findById(payload.userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      req.user = user;
      return next();
    }

    res.status(401).json({ error: "Authentication required" });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function issueToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "30d" });
}
