/**
 * Giphy API key pool. `GIPHY_API_KEY` may hold several keys separated by
 * commas (or whitespace) so requests can be spread across them and fail over
 * when one gets rate-limited.
 */

let cursor = 0;

/** Parse `GIPHY_API_KEY` into the list of non-empty keys it holds. */
export function getGiphyKeys(): string[] {
  return (process.env.GIPHY_API_KEY ?? '')
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Return `keys` reordered to start at the next round-robin position, so
 * concurrent requests on a warm instance don't all hammer the same key.
 * The returned array is the full pool — callers fail over down the list.
 */
export function rotatedKeys(keys: string[]): string[] {
  if (keys.length <= 1) return keys;
  const start = cursor % keys.length;
  cursor = (cursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}
