import { recordingResponse } from "@/lib/content-pipeline/audio-response";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => recordingResponse(request, true);
