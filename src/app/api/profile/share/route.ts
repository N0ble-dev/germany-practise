import { z } from "zod";
import { profileCardSchema } from "@/lib/social-model";
import { SocialError, SocialRepository } from "@/lib/social-repository";
import {
  socialActor,
  socialFailure,
  socialJson,
  socialResponse,
} from "@/lib/social-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({
  card: profileCardSchema,
  image: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/),
});
export async function GET(request: Request) {
  try {
    const actor = await socialActor(request);
    return socialResponse({
      share: await new SocialRepository().ownCard(actor.id),
    });
  } catch (error) {
    return socialFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await socialActor(request, true);
    const parsed = input.safeParse(await socialJson(request, 1_510_000));
    if (!parsed.success)
      throw new SocialError("Prepare your profile card again before sharing.");
    const bytes = Buffer.from(parsed.data.image.slice(22), "base64");
    if (
      bytes.length < 24 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(16) !== 800 ||
      bytes.readUInt32BE(20) !== 1125
    )
      throw new SocialError("Choose a valid profile card image.");
    return socialResponse({
      share: await new SocialRepository().publishCard(
        actor.id,
        parsed.data.card,
        parsed.data.image,
      ),
    });
  } catch (error) {
    return socialFailure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await socialActor(request, true);
    await new SocialRepository().unpublishCard(actor.id);
    return socialResponse({ removed: true });
  } catch (error) {
    return socialFailure(error);
  }
}
