import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
export function isAuthConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32,
  );
}
export function isCloudConfigured() {
  return Boolean(process.env.DATABASE_URL && isAuthConfigured());
}
function createAuth() {
  if (!isAuthConfigured()) throw new Error("Neon Auth is not configured");
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
