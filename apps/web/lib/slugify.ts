/**
 * Turn a nickname into a URL-safe slug. Returns null when the result
 * would be empty or has no letters (server action treats null as a
 * validation error and surfaces a friendly message).
 *
 * Rules (matches the spec, §6):
 *   - NFD normalize and drop combining marks (accents → base letter)
 *   - Lowercase
 *   - Replace runs of whitespace or `_` with `-`
 *   - Strip any character that isn't [a-z0-9-]
 *   - Collapse runs of `-` and trim leading/trailing
 *   - Cap at 32 chars, then re-trim trailing `-`
 *   - Reject digit-only results
 */
export function slugify(input: string): string | null {
  const normalized = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const capped = normalized.slice(0, 32).replace(/-+$/g, '');

  if (capped.length === 0) return null;
  if (!/[a-z]/.test(capped)) return null;
  return capped;
}
