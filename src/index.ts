import { connectDb } from "./db";
import { config } from "./config";
import app from "./app";

async function main() {
  await connectDb();

  app.listen(config.port, () => {
    console.log(`Iris auth server running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
