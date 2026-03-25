/**
 * Simple DJB2-style string hash that produces a 32-bit integer.
 * Used for generating deterministic numeric IDs from strings.
 */
export function simpleStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
