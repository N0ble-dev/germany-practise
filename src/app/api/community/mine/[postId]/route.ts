import { z } from "zod";
import { editPublicSentenceSchema } from "@/lib/community-model";
import {
  communityActor,
  communityBody,
  communityFailure,
  communityRepository,
  communityResponse,
} from "@/lib/community-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ postId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await communityActor(request, true),
      id = z.uuid().parse((await params).postId),
      input = await communityBody(request, editPublicSentenceSchema);
    return communityResponse({
      posts: await communityRepository().edit(user.id, id, input),
    });
  } catch (error) {
    return communityFailure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await communityActor(request, true),
      id = z.uuid().parse((await params).postId);
    await communityRepository().remove(user.id, id);
    return communityResponse({ removed: true });
  } catch (error) {
    return communityFailure(error);
  }
}
