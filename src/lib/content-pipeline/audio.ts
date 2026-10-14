import { fileHash } from "./hash.ts";

// Check the actual bytes, not author-supplied duration or QA flags.
export function inspectWav(bytes: Uint8Array) {
  const data = Buffer.from(bytes);
  if (
    data.length < 44 ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Expected a non-empty PCM WAV recording.");
  let channels = 0,
    sampleRate = 0,
    blockAlign = 0,
    audio: Buffer | null = null;
  for (let offset = 12; offset + 8 <= data.length;) {
    const key = data.toString("ascii", offset, offset + 4),
      size = data.readUInt32LE(offset + 4),
      start = offset + 8;
    if (start + size > data.length) throw new Error("Truncated WAV recording.");
    if (key === "fmt ") {
      if (
        size < 16 ||
        data.readUInt16LE(start) !== 1 ||
        data.readUInt16LE(start + 14) !== 16
      )
        throw new Error("Use 16-bit PCM WAV for audio verification.");
      channels = data.readUInt16LE(start + 2);
      sampleRate = data.readUInt32LE(start + 4);
      blockAlign = data.readUInt16LE(start + 12);
    }
    if (key === "data") audio = data.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (
    !audio?.length ||
    ![1, 2].includes(channels) ||
    sampleRate < 8000 ||
    sampleRate > 96000 ||
    blockAlign !== channels * 2 ||
    audio.length % blockAlign
  )
    throw new Error("WAV format or sample data is invalid.");
  const duration = audio.length / (sampleRate * blockAlign);
  if (duration < 0.15 || duration > 90)
    throw new Error("Each recording must last between 0.15 and 90 seconds.");
  let energy = 0,
    clipped = 0;
  for (let i = 0; i < audio.length; i += 2) {
    const sample = audio.readInt16LE(i) / 32768;
    energy += sample * sample;
    if (Math.abs(sample) >= 0.999) clipped++;
  }
  const samples = audio.length / 2;
  if (Math.sqrt(energy / samples) < 0.001)
    throw new Error("Recording is silent or too quiet.");
  if (clipped / samples > 0.01)
    throw new Error("Recording has excessive clipping.");
  return {
    duration,
    sampleRate,
    channels,
    bytes: data.length,
    fileHash: fileHash(data),
  };
}
