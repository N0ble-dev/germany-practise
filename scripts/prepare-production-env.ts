import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";

const target = ".env.vercel.production";
const appUrl = "https://germany-practise.vercel.app";

async function readEnvironment(file: string): Promise<Record<string, string>> {
  try {
    return parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new Error(`Could not read ${file}.`);
  }
}

async function prepare() {
  const local = await readEnvironment(".env.local");
  const previous = await readEnvironment(target);
  function setting(key: string) {
    return process.env[key] || previous[key] || local[key];
  }
  const required = ["NEON_AUTH_BASE_URL", "DATABASE_URL"];
  const missing = required.filter((key) => !setting(key));
  if (missing.length)
    throw new Error(`Fill ${missing.join(", ")} in .env.local first.`);
  const authUrl = new URL(setting("NEON_AUTH_BASE_URL")!);
  if (authUrl.protocol !== "https:" || authUrl.username || authUrl.password)
    throw new Error("NEON_AUTH_BASE_URL must be an HTTPS Auth URL.");
  const baseUrl = authUrl.href.replace(/\/$/, "");
  // Keep an existing production cookie secret stable when re-running this command.
  const secret = previous.NEON_AUTH_COOKIE_SECRET;
  const values: Record<string, string> = {
    APP_URL: appUrl,
    NEON_AUTH_BASE_URL: baseUrl,
    NEON_AUTH_JWKS_URL: `${baseUrl}/.well-known/jwks.json`,
    NEON_AUTH_COOKIE_SECRET:
      secret && secret.length >= 32 ? secret : randomBytes(32).toString("hex"),
    DATABASE_URL: setting("DATABASE_URL")!,
  };
  for (const key of [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "CALENDAR_TOKEN_ENCRYPTION_KEY",
  ]) {
    const value = setting(key);
    if (value) values[key] = value;
  }
  await writeFile(
    target,
    "# Private Vercel Production import. Do not commit or share.\n" +
      Object.entries(values)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("\n") +
      "\n",
    { mode: 0o600 },
  );
  console.log(`Prepared ${target} for ${appUrl}.`);
  console.log(
    "Import it in Vercel > Project Settings > Environment Variables, select Production, then redeploy.",
  );
  console.log("Also add the production origin to Neon Auth's trusted domains.");
}

prepare().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Could not prepare the production environment.",
  );
  process.exitCode = 1;
});
