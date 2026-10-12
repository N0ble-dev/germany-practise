export type AuthDestination =
  "/" | "/planner" | "/profile" | "/space" | `/space?invite=${string}`;

// OAuth return destinations are deliberately limited to app pages.
export function authDestination(value: unknown): AuthDestination {
  if (value === "/planner" || value === "/profile" || value === "/space")
    return value;
  if (typeof value === "string" && /^\/space\?invite=[a-f0-9]{64}$/.test(value))
    return value as AuthDestination;
  return "/";
}
