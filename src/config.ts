import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  internalSecret: required("INTERNAL_SECRET"),
  rustBackendUrl: process.env.RUST_BACKEND_URL ?? "http://localhost:8080",
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",").map((o) => o.trim()),
  isProd: process.env.NODE_ENV === "production",
};
