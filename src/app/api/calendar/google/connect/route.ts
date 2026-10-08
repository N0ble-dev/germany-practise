import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { NextResponse } from "next/server";
import {
  calendarAppUrl,
  calendarClient,
  calendarConfigured,
  calendarScope,
  calendarUser,
  oauthCookie,
  sealForCalendar,
  trustedCalendarRequest,
} from "@/lib/google-calendar";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!trustedCalendarRequest(request))
      return NextResponse.json(
        { error: "Start the connection from your learning app." },
        { status: 403 },
      );
    const user = await calendarUser();
    if (!user)
      return NextResponse.json(
        { error: "Sign in before connecting Google Calendar." },
        { status: 401 },
      );
    if (!calendarConfigured())
      return NextResponse.json(
        {
          error:
            "Google Calendar connection is not available yet. Download your plan instead.",
        },
        { status: 503 },
      );
    const state = randomBytes(32).toString("base64url"),
      client = calendarClient();
    const { codeVerifier, codeChallenge } =
      await client.generateCodeVerifierAsync();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      login_hint: user.email,
      scope: [calendarScope],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
    const response = NextResponse.json(
      { url },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(
      oauthCookie,
      sealForCalendar(
        JSON.stringify({
          state,
          codeVerifier,
          userId: user.id,
          expiresAt: Date.now() + 600_000,
        }),
        "calendar-oauth",
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: calendarAppUrl().startsWith("https:"),
        path: "/api/calendar/google",
        maxAge: 600,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Google Calendar connection could not start. Try again." },
      { status: 503 },
    );
  }
}
