function normalizeTimerNpcName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildTimerKey(npcId: number, npcName: string): string {
  return `${npcId}:${normalizeTimerNpcName(npcName)}`;
}

export function isLegacyNpcIdIdentifier(identifier: string): boolean {
  return /^\d+$/.test(identifier);
}
