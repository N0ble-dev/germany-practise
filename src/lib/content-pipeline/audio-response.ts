import "server-only";
import { ContentError } from "./repository";
import {
  contentActor,
  contentRepository,
  contentFailure,
  readRecording,
} from "./server";
export async function recordingResponse(request: Request, admin: boolean) {
  try {
    if (admin) await contentActor(request);
    const params = new URL(request.url).searchParams,
      key = params.get("lesson"),
      lineId = params.get("line");
    if (
      !key ||
      !lineId ||
      !/^[a-z0-9-]{1,100}$/.test(key) ||
      !/^[a-z0-9-]{1,100}$/.test(lineId)
    )
      throw new ContentError("Invalid lesson recording.");
    const repository = contentRepository();
    const version = Number(params.get("version"));
    if (admin && (!Number.isSafeInteger(version) || version < 1))
      throw new ContentError("Choose a lesson version.");
    const pack = admin
      ? (await repository.detail(key, version)).pack
      : (await repository.published()).find((l) => l.lessonKey === key)?.pack;
    if (!pack) throw new ContentError("This lesson is not published.", 404);
    const line = pack.dialogues
        .flatMap((d) => d.lines)
        .find((l) => l.id === lineId),
      asset = pack.media.find((m) => m.lineId === lineId);
    if (!line || !asset)
      throw new ContentError("This recording is not available.", 404);
    const { bytes } = await readRecording(asset, line.text.de);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return contentFailure(error);
  }
}
