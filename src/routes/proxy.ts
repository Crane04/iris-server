import { Router, Request, Response } from "express";
import axios, { AxiosError } from "axios";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { config } from "../config";

const router = Router();

// All proxy routes require authentication (session cookie or API key)
router.use(requireAuth);

// Forward any request to the Rust backend, adding the internal secret header.
// This keeps the Rust service fully internal — it never receives unauthenticated
// traffic from the public internet.
async function forwardToRust(req: Request, res: Response): Promise<void> {
  const url = `${config.rustBackendUrl}/v1${req.path}`;


  try {
    const response = await axios({
      method: req.method as "GET" | "POST",
      url,
      data: req.method !== "GET" ? req.body : undefined,
      headers: {
        "Content-Type": "application/json",
        // Shared secret — Rust checks this to reject anything not from us
        "X-Internal-Secret": config.internalSecret,
      },
      // Pass through query params
      params: req.query,
      // Stream large responses without buffering
      responseType: "json",
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
      res.status(axiosErr.response.status).json(axiosErr.response.data);
    } else {
      res.status(502).json({ error: "Backend unavailable" });
    }
  }
}

// Proxy the authenticated user through to all Rust routes
router.post("/compare", forwardToRust);
router.get("/stats", forwardToRust);
router.get("/health", forwardToRust);

export default router;
