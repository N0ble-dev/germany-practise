import { sentenceFeedQuery } from "@/lib/community-model";
import {
  communityFailure,
  communityRepository,
  communityResponse,
} from "@/lib/community-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const query = sentenceFeedQuery.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return communityResponse(
      await communityRepository().feed(query.q, query.cursor),
    );
  } catch (error) {
    return communityFailure(error);
  }
}
