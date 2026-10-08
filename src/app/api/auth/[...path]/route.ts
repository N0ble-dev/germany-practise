import { getAuth, isAuthConfigured } from "@/lib/auth";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
function handler(method: Method) {
  return async (
    request: Request,
    context: { params: Promise<{ path: string[] }> },
  ) => {
    const path = (await context.params).path.join("/");
    // Expose only the authentication operations this Google-only app uses.
    // Disabling other providers in Neon Console also protects the hosted URL.
    const allowed =
      (method === "GET" && ["get-session", "token", "jwks"].includes(path)) ||
      (method === "POST" && ["sign-in/social", "sign-out"].includes(path)) ||
      ((method === "GET" || method === "POST") && path === "callback/google");
    if (!allowed)
      return NextResponse.json(
        {
          code: "GOOGLE_ONLY",
          message: "Continue with Google to access your account.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    if (path === "sign-in/social") {
      try {
        const body = await request.clone().json();
        if (body?.provider !== "google")
          return NextResponse.json(
            {
              code: "GOOGLE_ONLY",
              message: "Only Google sign-in is available.",
            },
            { status: 403 },
          );
      } catch {
        return NextResponse.json(
          {
            code: "INVALID_REQUEST",
            message: "A Google sign-in request is required.",
          },
          { status: 400 },
        );
      }
    }
    if (!isAuthConfigured())
      return NextResponse.json(
        { error: "Accounts are not configured. Local learning is available." },
        { status: 503 },
      );
    try {
      return await getAuth().handler()[method](request, context);
    } catch {
      return NextResponse.json(
        {
          error: "Accounts could not connect. Check the server configuration.",
        },
        { status: 503 },
      );
    }
  };
}
export const GET = handler("GET");
export const POST = handler("POST");
export const PUT = handler("PUT");
export const DELETE = handler("DELETE");
export const PATCH = handler("PATCH");
