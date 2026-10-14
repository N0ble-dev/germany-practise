import { readFileSync } from "node:fs";
import { contentHash, fileHash } from "@/lib/content-pipeline/hash";
import { lessonPackSchema } from "@/lib/content-pipeline/model";
export function pilotPack() {
  return lessonPackSchema.parse(
    JSON.parse(readFileSync("content/lessons/a1-1/lesson-01.v1.json", "utf8")),
  );
}
export function recordingBytes() {
  const sampleRate = 16_000,
    samples = 8_000,
    bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 440) / sampleRate) * 6000),
      44 + i * 2,
    );
  return bytes;
}
// Synthetic fixtures only: neither these rights flags nor test approvals enter Neon.
export function completePack(version = 1) {
  const pack = pilotPack();
  pack.version = version;
  pack.rights.commercialUseCleared = true;
  const bytes = recordingBytes();
  for (const line of pack.dialogues.flatMap((d) => d.lines)) {
    const storageKey = `de/${pack.courseId}/${pack.id}/v${version}/${line.id}.wav`;
    line.audioKey = storageKey;
    pack.media.push({
      id: `audio-${line.id}`,
      lineId: line.id,
      storageKey,
      scriptHash: contentHash(line.text.de),
      fileHash: fileHash(bytes),
      bytes: bytes.length,
      mime: "audio/wav",
      licenseRef: "synthetic test recording only",
      attribution: "Test fixture",
    });
  }
  return lessonPackSchema.parse(pack);
}
