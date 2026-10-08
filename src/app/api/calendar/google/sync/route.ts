import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionsSchema } from "@/lib/planner-model";
import {
  calendarConfigured,
  calendarUser,
  syncCalendar,
  trustedCalendarRequest,
} from "@/lib/google-calendar";
export const runtime = "nodejs";
export const maxDuration = 300;
const schema = z.object({
  sessions: sessionsSchema,
  revision: z.number().int().min(0),
});
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  try {
    if (!trustedCalendarRequest(request))
      return response({ error: "Sync from your learning app." }, 403);
    const user = await calendarUser();
    if (!user)
      return response({ error: "Sign in to sync your study plan." }, 401);
    if (!calendarConfigured())
      return response(
        {
          error:
            "Google Calendar connection is not available yet. Download your plan instead.",
        },
        503,
      );
    const text = await request.text();
    if (text.length > 1_000_000)
      return response({ error: "Your plan is too large to sync." }, 413);
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return response({ error: "Use a valid study plan." }, 400);
    }
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      return response(
        { error: "Check the session dates, durations, and reminder settings." },
        400,
      );
    const result = await syncCalendar(
      user.id,
      parsed.data.sessions,
      parsed.data.revision,
    );
    if (result.conflict)
      return response(
        {
          error:
            "This calendar connection changed or is already syncing. Refresh the connection status before trying again.",
        },
        409,
      );
    if (result.failed)
      return response(
        {
          ...result,
          error:
            "Some sessions could not sync. Try again to finish updating your calendar.",
        },
        502,
      );
    return response(result);
  } catch {
    return response(
      {
        error:
          "Your calendar could not sync. Your plan is still saved here. Try reconnecting Google Calendar if this continues.",
      },
      503,
    );
  }
}
