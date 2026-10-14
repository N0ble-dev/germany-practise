import "server-only";
import { readExamRecording } from "./media-loader";
import type { ExamPack } from "./model";

export function readExamMedia(
  asset: ExamPack["media"][number],
  script: string,
) {
  return readExamRecording(
    asset,
    script,
    process.env.CONTENT_AUDIO_BASE_URL ?? "",
  );
}
