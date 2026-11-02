import { normalizeNpcName } from "#src/shared/margonem/npc-identity";

export function buildTimerKey(npcId: number, npcName: string): string {
  return `${npcId}:${normalizeNpcName(npcName)}`;
}

/** The Redis lock every writer of one timer row takes. */
export function buildTimerLockKey(
  guildId: string,
  world: string,
  timerKey: string,
): string {
  return `timer:lock:${guildId}:${world}:${timerKey}`;
}

export function isLegacyNpcIdIdentifier(identifier: string): boolean {
  return /^\d+$/.test(identifier);
}
