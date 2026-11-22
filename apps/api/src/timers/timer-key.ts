import { normalizeNpcName } from "@lootlog/schema/npc-identity";

export function buildTimerKey(npcId: number, npcName: string): string {
  return `${npcId}:${normalizeNpcName(npcName)}`;
}

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
