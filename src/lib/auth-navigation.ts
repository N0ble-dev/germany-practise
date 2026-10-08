export type AuthDestination = "/" | "/planner" | "/profile";

// OAuth return destinations are deliberately limited to app pages.
export function authDestination(value: unknown): AuthDestination {
  return value === "/planner" || value === "/profile" ? value : "/";
}
