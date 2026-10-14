import { contentRoles, type ContentRole } from "./model.ts";
export function rolesForEmail(
  email: string,
  verified: boolean,
  env: Record<string, string | undefined> = process.env,
): ContentRole[] {
  if (!verified) return [];
  const normalized = email.trim().toLowerCase();
  return contentRoles.filter((role) =>
    (env[`CONTENT_${role.toUpperCase()}_EMAILS`] ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .includes(normalized),
  );
}
