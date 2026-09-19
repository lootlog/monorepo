/**
 * Stable map key for a Margonem character identity. A character id is only
 * unique within its account, so every per-character projection keyed by a
 * plain string must combine both parts the same way.
 */
export function getCharacterIdentityKey(
  accountId: string,
  characterId: string,
): string {
  return `${accountId}:${characterId}`;
}
