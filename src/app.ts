import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import authRoutes from "./routes/auth";
import keysRoutes from "./routes/keys";
import proxyRoutes from "./routes/proxy";
import playgroundRoutes from "./routes/playground";

const app = express();

// Trust reverse proxy headers (for rate limiting by real IP behind nginx/etc)
app.set("trust proxy", 1);

// CORS — only allow configured origins, and allow cookies to be sent
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (config.allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true, // required for cookies to work cross-origin
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Global rate limit: 60 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
app.use(globalLimiter);

// Stricter limit for auth endpoints to slow brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many auth attempts, please try again later" },
});

app.use("/auth", authLimiter, authRoutes);
app.use("/keys", keysRoutes);
app.use("/v1", proxyRoutes);
app.use("/playground", playgroundRoutes);

// Health check (no auth required)
app.get("/health", (_req, res) => res.json({ ok: true }));

export default app;
