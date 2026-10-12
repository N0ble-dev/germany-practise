import type { SocialAction } from "./social-model";

export async function socialFetch<T>(
  accountId: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Learning-Account": accountId,
      ...init.headers,
    },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Shared learning could not connect.");
  return body as T;
}
export function spaceAction(
  accountId: string,
  action: SocialAction,
  signal: AbortSignal,
) {
  return socialFetch<{ spaceId?: string; token?: string }>(
    accountId,
    "/api/spaces",
    {
      method: "POST",
      body: JSON.stringify(action),
      signal,
    },
  );
}
export async function copyShareLink(url: string) {
  if (!navigator.clipboard)
    throw new Error("Copy the link from the field below.");
  await navigator.clipboard.writeText(url);
}
