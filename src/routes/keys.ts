import { Router, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { ApiKey, generateRawKey, hashKey } from "../models/ApiKey";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// All key routes require authentication
router.use(requireAuth);

// GET /keys — list all API keys for the current user
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const keys = await ApiKey.find({ userId: req.user!._id })
    .select("-keyHash")  // never expose the hash
    .sort({ createdAt: -1 });
  res.json({ keys });
});

// POST /keys — generate a new API key
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const schema = z.object({
    name: z.string().min(1).max(80),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const userId = req.user!._id as mongoose.Types.ObjectId;

  // Limit to 10 keys per user
  const count = await ApiKey.countDocuments({ userId });
  if (count >= 10) {
    res.status(429).json({ error: "Maximum of 10 API keys allowed per account" });
    return;
  }

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 12); // "iris_" + 7 chars, enough to identify

  const keyDoc = await ApiKey.create({
    userId,
    name: result.data.name,
    keyHash,
    prefix,
  });

  // Return the raw key ONCE — it cannot be retrieved again
  res.status(201).json({
    key: rawKey,
    id: keyDoc._id,
    name: keyDoc.name,
    prefix: keyDoc.prefix,
    createdAt: keyDoc.createdAt,
    message: "Store this key securely — it will not be shown again.",
  });
});

// DELETE /keys/:id — revoke an API key
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid key ID" });
    return;
  }

  const deleted = await ApiKey.findOneAndDelete({
    _id: id,
    userId: req.user!._id, // ensure user owns this key
  });

  if (!deleted) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  res.json({ ok: true });
});

export default router;
