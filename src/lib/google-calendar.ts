import "server-only";
import { OAuth2Client } from "google-auth-library";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { getAuth, isCloudConfigured } from "./auth";
import { openCalendarSecret, sealCalendarSecret } from "./calendar-security";
import { googleEvent, googleEventId } from "./planner-calendar";
import type { StudySession } from "./planner-model";

export const calendarScope =
  "https://www.googleapis.com/auth/calendar.app.created";
export const oauthCookie = "dj-google-calendar-oauth";
export function calendarConfigured() {
  return Boolean(
    isCloudConfigured() &&
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.APP_URL &&
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY &&
    Buffer.from(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY, "base64").length ===
      32,
  );
}
export function calendarAppUrl() {
  const origin = new URL(process.env.APP_URL ?? "http://localhost:3008");
  if (
    origin.protocol !== "https:" &&
    !(
      origin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname)
    )
  )
    throw new Error("Calendar connection requires HTTPS or localhost.");
  return origin.origin;
}
export function calendarClient() {
  if (!calendarConfigured())
    throw new Error("Google Calendar is not configured.");
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri: new URL("/api/calendar/google/callback", calendarAppUrl())
      .href,
  });
}
export function sealForCalendar(value: string, context: string) {
  return sealCalendarSecret(
    value,
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY!,
    context,
  );
}
export function openForCalendar(value: string, context: string) {
  return openCalendarSecret(
    value,
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY!,
    context,
  );
}
export async function calendarUser() {
  if (!isCloudConfigured()) return null;
  const { data, error } = await getAuth().getSession();
  if (error) throw new Error("The account service could not connect.");
  return data?.user ?? null;
}
export function trustedCalendarRequest(request: Request) {
  return request.headers.get("origin") === calendarAppUrl();
}
export async function calendarConnection(userId: string) {
  const [row] = await getDb()
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId));
  return row;
}
function providerStatus(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = error.response;
    if (response && typeof response === "object" && "status" in response)
      return Number(response.status);
  }
  return 0;
}
const api = "https://www.googleapis.com/calendar/v3/calendars";
export async function finishCalendarConnection(
  userId: string,
  code: string,
  codeVerifier: string,
) {
  const client = calendarClient();
  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens.refresh_token)
    throw new Error("Google did not issue an offline credential.");
  const granted = (tokens.scope ?? "").split(" ");
  if (!granted.includes(calendarScope))
    throw new Error("Calendar permission was not granted.");
  client.setCredentials(tokens);
  const previous = await calendarConnection(userId);
  if (previous?.syncLockUntil && previous.syncLockUntil.getTime() > Date.now())
    throw new Error(
      "Wait for the current calendar sync to finish before reconnecting.",
    );
  let calendarId: string | undefined = previous?.calendarId;
  if (calendarId) {
    try {
      await client.request({
        url: `${api}/${encodeURIComponent(calendarId)}`,
        timeout: 15_000,
        retry: false,
      });
    } catch (error) {
      if (providerStatus(error) === 404) calendarId = undefined;
      else throw error;
    }
  }
  if (!calendarId) {
    const { data } = await client.request<{ id: string }>({
      url: api,
      method: "POST",
      data: {
        summary: "Deutsch Journey · My study plan",
        description:
          "Small German study sessions and reminders from Deutsch Journey.",
        timeZone: "UTC",
      },
      timeout: 15_000,
      retry: false,
    });
    if (!data.id) throw new Error("The study calendar could not be created.");
    calendarId = data.id;
  }
  const sameCalendar = previous?.calendarId === calendarId;
  const [saved] = await getDb()
    .insert(googleCalendarConnections)
    .values({
      userId,
      calendarId,
      refreshToken: sealForCalendar(
        tokens.refresh_token,
        `calendar-token:${userId}`,
      ),
      syncedIds: sameCalendar ? previous.syncedIds : [],
      revision: (previous?.revision ?? 0) + 1,
      syncedAt: sameCalendar ? previous.syncedAt : null,
    })
    .onConflictDoUpdate({
      target: googleCalendarConnections.userId,
      set: {
        calendarId,
        refreshToken: sealForCalendar(
          tokens.refresh_token,
          `calendar-token:${userId}`,
        ),
        syncedIds: sameCalendar ? previous.syncedIds : [],
        revision: sql`${googleCalendarConnections.revision}+1`,
        syncLockUntil: null,
        syncedAt: sameCalendar ? previous.syncedAt : null,
        updatedAt: new Date(),
      },
      setWhere: and(
        eq(googleCalendarConnections.revision, previous?.revision ?? 0),
        or(
          isNull(googleCalendarConnections.syncLockUntil),
          lt(googleCalendarConnections.syncLockUntil, new Date()),
        ),
      ),
    })
    .returning({ userId: googleCalendarConnections.userId });
  if (!saved)
    throw new Error(
      "The calendar connection changed while connecting. Try again.",
    );
}
export async function syncCalendar(
  userId: string,
  sessions: StudySession[],
  revision: number,
) {
  const db = getDb(),
    now = new Date();
  const deadline = now.getTime() + 210_000;
  const [connection] = await db
    .update(googleCalendarConnections)
    .set({ syncLockUntil: new Date(now.getTime() + 5 * 60_000) })
    .where(
      and(
        eq(googleCalendarConnections.userId, userId),
        eq(googleCalendarConnections.revision, revision),
        or(
          isNull(googleCalendarConnections.syncLockUntil),
          lt(googleCalendarConnections.syncLockUntil, now),
        ),
      ),
    )
    .returning();
  if (!connection) return { conflict: true as const };
  const wanted = sessions.filter((s) => s.status !== "skipped"),
    wantedIds = new Set(wanted.map((s) => s.id));
  const tracked = new Set([...connection.syncedIds, ...wantedIds]);
  let failed = 0,
    succeeded = 0;
  try {
    // Register IDs before provider writes so a retry can reconcile partially created events.
    await db
      .update(googleCalendarConnections)
      .set({ syncedIds: [...tracked] })
      .where(eq(googleCalendarConnections.userId, userId));
    const client = calendarClient();
    client.setCredentials({
      refresh_token: openForCalendar(
        connection.refreshToken,
        `calendar-token:${userId}`,
      ),
    });
    const url = `${api}/${encodeURIComponent(connection.calendarId)}/events`;
    // Bound concurrency, quota use, and timeouts. IDs make retrying safe without duplicate events.
    for (let offset = 0; offset < wanted.length; offset += 4) {
      if (Date.now() >= deadline) {
        failed += wanted.length - offset;
        break;
      }
      await Promise.all(
        wanted.slice(offset, offset + 4).map(async (s) => {
          try {
            const id = googleEventId(s.id),
              data = googleEvent(s, calendarAppUrl());
            try {
              await client.request({
                url: `${url}/${id}`,
                method: "PUT",
                data,
                timeout: 15_000,
                retry: false,
              });
            } catch (error) {
              if (providerStatus(error) !== 404) throw error;
              try {
                await client.request({
                  url,
                  method: "POST",
                  data: { ...data, id },
                  timeout: 15_000,
                  retry: false,
                });
              } catch (insertError) {
                if (providerStatus(insertError) !== 409) throw insertError;
                await client.request({
                  url: `${url}/${id}`,
                  method: "PUT",
                  data,
                  timeout: 15_000,
                  retry: false,
                });
              }
            }
            succeeded++;
          } catch {
            failed++;
          }
        }),
      );
    }
    const removedIds = connection.syncedIds.filter((id) => !wantedIds.has(id));
    for (let index = 0; index < removedIds.length; index++) {
      if (Date.now() >= deadline) {
        failed += removedIds.length - index;
        break;
      }
      const id = removedIds[index];
      try {
        try {
          await client.request({
            url: `${url}/${googleEventId(id)}`,
            method: "DELETE",
            timeout: 15_000,
            retry: false,
          });
        } catch (error) {
          if (![404, 410].includes(providerStatus(error))) throw error;
        }
        tracked.delete(id);
      } catch {
        failed++;
      }
    }
    await db
      .update(googleCalendarConnections)
      .set({
        syncedIds: [...tracked],
        revision: revision + 1,
        syncedAt: failed === 0 ? new Date() : connection.syncedAt,
        syncLockUntil: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(googleCalendarConnections.userId, userId),
          eq(googleCalendarConnections.revision, revision),
        ),
      );
    return {
      conflict: false as const,
      failed,
      succeeded,
      revision: revision + 1,
    };
  } catch {
    await db
      .update(googleCalendarConnections)
      .set({ syncLockUntil: null })
      .where(
        and(
          eq(googleCalendarConnections.userId, userId),
          eq(googleCalendarConnections.revision, revision),
        ),
      );
    throw new Error(
      "Calendar syncing could not finish. Try again; your plan is saved here.",
    );
  }
}
export async function disconnectCalendar(userId: string) {
  const now = new Date();
  const [removed] = await getDb()
    .delete(googleCalendarConnections)
    .where(
      and(
        eq(googleCalendarConnections.userId, userId),
        or(
          isNull(googleCalendarConnections.syncLockUntil),
          lt(googleCalendarConnections.syncLockUntil, now),
        ),
      ),
    )
    .returning();
  if (!removed) return !(await calendarConnection(userId));
  try {
    await calendarClient().revokeToken(
      openForCalendar(removed.refreshToken, `calendar-token:${userId}`),
    );
  } catch {
    /* The local credential is removed even if Google is unavailable. */
  }
  return true;
}
