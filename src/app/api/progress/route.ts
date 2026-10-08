import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth, isCloudConfigured } from "@/lib/auth";
import { stateSchema } from "@/lib/learning";
import { getDb } from "@/db";
import { learningStates } from "@/db/schema";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function authenticated() {
  if (!isCloudConfigured()) return null;
  const { data, error } = await getAuth().getSession();
  if (error) throw new Error("The account session could not be checked.");
  return data?.user ? data : null;
}
export async function GET() {
  if (!isCloudConfigured())
    return response({ error: "Cloud saving is not configured." }, 503);
  try {
    const session = await authenticated();
    if (!session)
      return response({ error: "Sign in to access your cloud progress." }, 401);
    const [row] = await getDb()
      .select({
        data: learningStates.data,
        revision: learningStates.revision,
        updatedAt: learningStates.updatedAt,
      })
      .from(learningStates)
      .where(eq(learningStates.userId, session.user.id));
    return response(
      row
        ? { data: row.data, revision: row.revision, updatedAt: row.updatedAt }
        : { data: null, revision: 0 },
    );
  } catch {
    return response(
      { error: "Cloud progress could not be loaded. Your local data is safe." },
      503,
    );
  }
}
const inputSchema = z.object({
  data: stateSchema,
  revision: z.number().int().min(0),
});
export async function PUT(request: Request) {
  if (!isCloudConfigured())
    return response({ error: "Cloud saving is not configured." }, 503);
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL ?? request.url).origin
  )
    return response(
      { error: "This request must come from your learning app." },
      403,
    );
  try {
    const session = await authenticated();
    if (!session)
      return response({ error: "Sign in to save your progress." }, 401);
    const body = await request.text();
    if (body.length > 2_000_000)
      return response({ error: "Your backup is too large to save." }, 413);
    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      return response({ error: "Use a valid JSON backup." }, 400);
    }
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success)
      return response({ error: "The learning data format is invalid." }, 400);
    const { data, revision } = parsed.data;
    const db = getDb();
    // Compare-and-swap prevents a stale device from silently replacing newer progress.
    const rows =
      revision === 0
        ? await db
            .insert(learningStates)
            .values({ userId: session.user.id, data })
            .onConflictDoNothing()
            .returning({ revision: learningStates.revision })
        : await db
            .update(learningStates)
            .set({
              data,
              revision: sql`${learningStates.revision} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(learningStates.userId, session.user.id),
                eq(learningStates.revision, revision),
              ),
            )
            .returning({ revision: learningStates.revision });
    if (!rows.length)
      return response(
        {
          error:
            "Another device has newer progress. Export your local backup, then load the cloud version before saving again.",
        },
        409,
      );
    return response({ revision: rows[0].revision });
  } catch {
    return response(
      {
        error:
          "Cloud saving could not finish. Your progress is still saved on this device.",
      },
      503,
    );
  }
}
