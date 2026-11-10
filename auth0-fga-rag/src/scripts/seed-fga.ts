import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedOpenFgaStore } from "../fga/openfga-sdk-client.ts";
import type { FgaTuple } from "../types.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function main() {
  const apiUrl = process.env.FGA_API_URL || "http://127.0.0.1:8080";
  const model = JSON.parse(readFileSync(join(rootDir, "fga", "model.json"), "utf8"));
  const tuples: FgaTuple[] = JSON.parse(
    readFileSync(join(rootDir, "fga", "tuples.json"), "utf8")
  );
  const seeded = await seedOpenFgaStore(apiUrl, model, tuples);
  console.log("Seeded OpenFGA store");
  console.log(`FGA_API_URL=${apiUrl}`);
  console.log(`FGA_STORE_ID=${seeded.storeId}`);
  console.log(`FGA_MODEL_ID=${seeded.modelId}`);
  console.log("Add those values to your .env file.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
