import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPool } from "@vercel/postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("POSTGRES_URL is required");
    process.exit(1);
  }

  const pool = createPool({ connectionString });
  const schemaPath = path.join(__dirname, "../lib/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  await pool.query(schema);
  console.log("Database schema initialized.");

  const seedPath = path.join(__dirname, "seed.sql");
  if (fs.existsSync(seedPath)) {
    const seed = fs.readFileSync(seedPath, "utf-8");
    const statements = seed
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log("Seed data applied (if any).");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
