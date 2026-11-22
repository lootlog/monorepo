export function getCharacterIdentityKey(
  accountId: string,
  characterId: string,
): string {
  return `${accountId}:${characterId}`;
}
