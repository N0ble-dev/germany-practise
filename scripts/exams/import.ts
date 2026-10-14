import { readFileSync, realpathSync } from "node:fs";
import { resolve, relative } from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ExamRepository } from "../../src/lib/exams/repository.ts";
const file = process.argv[2],
  envFile = process.argv[3];
if (!file || !envFile)
  throw new Error(
    "Usage: npm run exams:import -- content/exams/<exam>/<pack>.json <explicit-env-file>",
  );
const root = realpathSync(resolve("content/exams")),
  target = realpathSync(resolve(file)),
  inside = relative(root, target);
if (inside.startsWith("..") || !inside.endsWith(".json"))
  throw new Error("Import a JSON pack from the content/exams directory.");
config({ path: envFile, quiet: true, override: true });
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url || new URL(url).hostname.includes("-pooler"))
  throw new Error(
    "Set an explicit direct DATABASE_URL_UNPOOLED for content import.",
  );
const db = drizzle(neon(url));
const repo = new ExamRepository((query) => db.execute(query));
const result = await repo.importDraft(JSON.parse(readFileSync(target, "utf8")));
console.log(
  JSON.stringify({
    ...result,
    status: "draft",
    published: false,
    note: "No human approvals or publication were created.",
  }),
);
