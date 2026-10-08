import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  calendarAppUrl,
  calendarConfigured,
  calendarUser,
  finishCalendarConnection,
  oauthCookie,
  openForCalendar,
} from "@/lib/google-calendar";
import { validOAuthState } from "@/lib/calendar-security";
export const runtime = "nodejs";
const pendingSchema = z.object({
  state: z.string().min(32).max(100),
  codeVerifier: z.string().min(43).max(128),
  userId: z.string().uuid(),
  expiresAt: z.number(),
});
export async function GET(request: NextRequest) {
  let outcome = "error";
  try {
    const pending = request.cookies.get(oauthCookie)?.value;
    if (!calendarConfigured() || !pending)
      throw new Error("Missing calendar connection state.");
    const data = pendingSchema.parse(
      JSON.parse(openForCalendar(pending, "calendar-oauth")),
    );
    const user = await calendarUser();
    if (
      !user ||
      user.id !== data.userId ||
      data.expiresAt < Date.now() ||
      data.expiresAt > Date.now() + 600_000 ||
      !validOAuthState(
        data.state,
        request.nextUrl.searchParams.get("state") ?? "",
      )
    )
      throw new Error("Invalid calendar connection state.");
    if (request.nextUrl.searchParams.has("error")) outcome = "cancelled";
    else {
      const code = request.nextUrl.searchParams.get("code");
      if (!code || code.length > 4096)
        throw new Error("Missing calendar authorization.");
      await finishCalendarConnection(user.id, code, data.codeVerifier);
      outcome = "connected";
    }
  } catch {
    /* Never expose provider authorization codes, tokens, or raw errors in the redirect. */
  }
  const response = NextResponse.redirect(
    new URL(`/planner?calendar=${outcome}`, calendarAppUrl()),
  );
  response.cookies.set(oauthCookie, "", {
    path: "/api/calendar/google",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: calendarAppUrl().startsWith("https:"),
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
