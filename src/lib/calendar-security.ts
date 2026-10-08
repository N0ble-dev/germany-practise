import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export function sealCalendarSecret(
  value: string,
  key: string,
  context: string,
) {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error("Calendar encryption needs a 32-byte key.");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", bytes, iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function openCalendarSecret(
  value: string,
  key: string,
  context: string,
) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid calendar credential.");
  const [iv, tag, encrypted] = parts.map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "base64"),
    iv,
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
export function validOAuthState(expected: string, received: string) {
  const a = Buffer.from(expected),
    b = Buffer.from(received);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
