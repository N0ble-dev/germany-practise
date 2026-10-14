export type AuthDestination =
  | "/"
  | "/planner"
  | "/profile"
  | "/space"
  | "/sentences"
  | "/admin/content"
  | "/admin/content/coverage"
  | "/admin/content/imports"
  | "/admin/content/imports/deutsch-im-blick"
  | "/admin/exams"
  | "/exams/plan"
  | "/exams/mistakes"
  | `/exams/${string}/practice/${string}`
  | `/exams/attempts/${string}/take`
  | `/exams/attempts/${string}/report`
  | `/space?invite=${string}`;

// OAuth return destinations are deliberately limited to app pages.
export function authDestination(value: unknown): AuthDestination {
  if (
    value === "/planner" ||
    value === "/profile" ||
    value === "/space" ||
    value === "/sentences" ||
    value === "/admin/content" ||
    value === "/admin/content/coverage" ||
    value === "/admin/content/imports" ||
    value === "/admin/content/imports/deutsch-im-blick" ||
    value === "/admin/exams" ||
    value === "/exams/plan" ||
    value === "/exams/mistakes"
  )
    return value;
  if (typeof value === "string" && /^\/space\?invite=[a-f0-9]{64}$/.test(value))
    return value as AuthDestination;
  if (
    typeof value === "string" &&
    (/^\/exams\/goethe-(?:a1-sd1|a2|b1|b2|c1|c2)-adult\/practice\/(?:listening|reading|writing|speaking)$/.test(
      value,
    ) ||
      /^\/exams\/attempts\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\/(?:take|report)$/.test(
        value,
      ))
  )
    return value as AuthDestination;
  return "/";
}
