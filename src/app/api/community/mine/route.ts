import { publishSentencesSchema } from "@/lib/community-model";
import {
  communityActor,
  communityBody,
  communityFailure,
  communityRepository,
  communityResponse,
} from "@/lib/community-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await communityActor(request);
    return communityResponse({
      posts: await communityRepository().own(user.id),
    });
  } catch (error) {
    return communityFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await communityActor(request, true),
      input = await communityBody(request, publishSentencesSchema);
    return communityResponse({
      posts: await communityRepository().publish(user.id, input),
    });
  } catch (error) {
    return communityFailure(error);
  }
}
