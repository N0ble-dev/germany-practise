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
