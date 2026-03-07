import mongoose, { Document, Schema } from "mongoose";
import crypto from "crypto";

export interface IApiKey extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string;    // SHA-256 hash of the raw key — never stored raw
  prefix: string;     // first 8 chars of key, shown in dashboard for identification
  lastUsedAt: Date | null;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Generate a new key: "iris_" + 40 random hex bytes = 80 char suffix
export function generateRawKey(): string {
  return "iris_" + crypto.randomBytes(40).toString("hex");
}

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export const ApiKey = mongoose.model<IApiKey>("ApiKey", apiKeySchema);
