import { Router, Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { requireAuth, issueToken, AuthRequest } from "../middleware/auth";
import { config } from "../config";

const router = Router();

const cookieOptions = {
  httpOnly: true,                    // not accessible from JS — key security property
  secure: config.isProd,             // HTTPS only in production
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
};

// POST /auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const { name, email, password } = result.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const user = await User.create({ name, email, password });
  // const token = issueToken(String(user._id));
  // res.cookie("token", token, cookieOptions);
  res.status(201).json({ user });
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = result.data;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    // Same error for both cases to avoid user enumeration
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = issueToken(String(user._id));
  res.cookie("token", token, cookieOptions);
  res.json({ user });
});

// POST /auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// GET /auth/me
router.get("/me", requireAuth, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
