export async function communityFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error || "Your sentence action could not finish. Try again.",
    );
  return body as T;
}
