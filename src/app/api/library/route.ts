import { z } from "zod";
import { libraryRepository } from "@/lib/library/server";
import { libraryQuerySchema } from "@/lib/library/model";
import { ContentError } from "@/lib/content-pipeline/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown) =>
  Response.json(body, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if (!params.size) return response(await libraryRepository().overview());
    if (params.has("item")) {
      const id = z.coerce
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .safeParse(params.get("item"));
      if (!id.success) throw new ContentError("Choose a valid library item.");
      return response(await libraryRepository().detail(id.data));
    }
    const input = libraryQuerySchema.safeParse(Object.fromEntries(params));
    if (!input.success) throw new ContentError("Check your library filters.");
    return response(await libraryRepository().list(input.data));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ContentError
            ? error.message
            : "The library could not load. Try again shortly.",
      },
      {
        status: error instanceof ContentError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
