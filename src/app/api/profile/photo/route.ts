import { getAuth, isAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
const failure = (status: number, error: string) =>
  Response.json({ error }, { status, headers });
const maxBytes = 2_000_000;

export async function GET(request: Request) {
  if (!isAuthConfigured())
    return failure(503, "Account photos are unavailable.");
  try {
    const { data, error } = await getAuth().getSession();
    if (error) return failure(503, "Your account photo could not be checked.");
    if (!data?.user) return failure(401, "Sign in to view your account photo.");
    const expectedAccount = request.headers.get("X-Learning-Account");
    if (expectedAccount && expectedAccount !== data.user.id)
      return failure(409, "Your account changed. Reload your profile.");
    if (!data.user.image)
      return failure(404, "Your Google account has no photo.");
    const photo = new URL(data.user.image);
    if (
      photo.protocol !== "https:" ||
      photo.username ||
      photo.password ||
      photo.port ||
      !/^(?:[a-z0-9-]+\.)*googleusercontent\.com$/i.test(photo.hostname)
    )
      return failure(404, "A Google account photo is not available.");

    const image = await fetch(photo, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    });
    const type = image.headers.get("content-type")?.split(";")[0].trim();
    if (
      !image.ok ||
      !type ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
      ].includes(type) ||
      !image.body
    )
      return failure(502, "Your Google photo could not load.");
    if (Number(image.headers.get("content-length")) > maxBytes) {
      await image.body.cancel();
      return failure(413, "Your account photo is too large.");
    }
    const reader = image.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return failure(413, "Your account photo is too large.");
      }
      chunks.push(value);
    }
    if (!size) return failure(502, "Your Google photo could not load.");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(bytes, {
      headers: { ...headers, "Content-Type": type },
    });
  } catch {
    return failure(502, "Your Google photo could not load. Try again later.");
  }
}
