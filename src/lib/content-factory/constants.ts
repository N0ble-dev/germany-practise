export const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const skills = ["listening", "reading", "writing", "speaking"] as const;
export const coverageStates = [
  "missing",
  "draft",
  "needs_review",
  "ready",
  "published",
  "needs_revision",
] as const;
export type CoverageState = (typeof coverageStates)[number];
