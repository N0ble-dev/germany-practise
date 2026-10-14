export type ContentChange = { path: string; before: string; after: string };
export function diffContent(
  before: unknown,
  after: unknown,
  path = "$",
): ContentChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    before !== null &&
    after !== null &&
    typeof before === "object" &&
    typeof after === "object" &&
    Array.isArray(before) === Array.isArray(after)
  ) {
    const a = before as Record<string, unknown>,
      b = after as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .sort()
      .flatMap((key) => diffContent(a[key], b[key], `${path}.${key}`));
  }
  const display = (value: unknown) =>
    (value === undefined ? "(absent)" : JSON.stringify(value)).slice(0, 5000);
  return [{ path, before: display(before), after: display(after) }];
}
