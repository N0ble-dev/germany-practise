import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({ path: ".env.local" });
config();
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/neon",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? "" },
});
