import { NextResponse } from "next/server";
import {
  calendarConfigured,
  calendarConnection,
  calendarUser,
  disconnectCalendar,
  trustedCalendarRequest,
} from "@/lib/google-calendar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  try {
    const user = await calendarUser();
    if (!user)
      return response({
        configured: calendarConfigured(),
        signedIn: false,
        connected: false,
      });
    const row = await calendarConnection(user.id);
    return response({
      configured: calendarConfigured(),
      signedIn: true,
      connected: Boolean(row),
      revision: row?.revision ?? 0,
      syncedAt: row?.syncedAt ?? null,
      syncedSessionIds: row?.syncedIds ?? [],
    });
  } catch {
    return response(
      { error: "Calendar connection could not be checked. Try again." },
      503,
    );
  }
}
export async function DELETE(request: Request) {
  try {
    if (!trustedCalendarRequest(request))
      return response({ error: "Use your learning app to disconnect." }, 403);
    const user = await calendarUser();
    if (!user)
      return response(
        { error: "Sign in to manage your calendar connection." },
        401,
      );
    if (!(await disconnectCalendar(user.id)))
      return response(
        {
          error:
            "Your calendar is syncing. Try disconnecting again in a moment.",
        },
        409,
      );
    return response({ disconnected: true });
  } catch {
    return response(
      { error: "The connection could not be removed. Try again." },
      503,
    );
  }
}
