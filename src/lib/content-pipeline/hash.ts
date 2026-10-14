import { createHash } from "node:crypto";
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const contentHash = (value: unknown) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
export const fileHash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
