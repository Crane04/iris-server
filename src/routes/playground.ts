import { Router, Request, Response } from "express";
import axios, { AxiosError } from "axios";
import rateLimit from "express-rate-limit";
import { config } from "../config";

const router = Router();

// Strict rate limit for unauthenticated playground access:
// 10 requests per hour per IP. Enough to demo, not enough to abuse.
const playgroundLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Playground rate limit reached. Sign up for an API key to get higher limits.",
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind proxy, else socket IP
    const forwarded = req.headers["x-forwarded-for"];
    return (
      (typeof forwarded === "string"
        ? forwarded.split(",")[0]
        : req.socket.remoteAddress) ?? "unknown"
    );
  },
});

router.post(
  "/compare",
  playgroundLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const response = await axios.post(
        `${config.rustBackendUrl}/v1/compare`,
        req.body,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": config.internalSecret,
          },
        },
      );
      res.status(response.status).json(response.data);
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        res.status(axiosErr.response.status).json(axiosErr.response.data);
      } else {
        res.status(502).json({ error: "Backend unavailable" });
      }
    }
  },
);

export default router;
