import { z } from "zod";
import { socialActionSchema } from "@/lib/social-model";
import { SocialError, SocialRepository } from "@/lib/social-repository";
import {
  socialActor,
  socialFailure,
  socialJson,
  socialResponse,
} from "@/lib/social-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await socialActor(request);
    const params = new URL(request.url).searchParams;
    const spaceId = params.get("spaceId"),
      cursor = params.get("cursor");
    if (
      spaceId &&
      (!z.uuid().safeParse(spaceId).success ||
        (cursor && !z.uuid().safeParse(cursor).success))
    )
      throw new SocialError("Choose a valid study space.");
    const repository = new SocialRepository();
    return socialResponse(
      spaceId
        ? await repository.detail(actor.id, spaceId, cursor ?? undefined)
        : { spaces: await repository.list(actor.id) },
    );
  } catch (error) {
    return socialFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await socialActor(request, true);
    const parsed = socialActionSchema.safeParse(await socialJson(request));
    if (!parsed.success)
      throw new SocialError("Check your shared content and try again.");
    return socialResponse(await new SocialRepository().act(actor, parsed.data));
  } catch (error) {
    return socialFailure(error);
  }
}
