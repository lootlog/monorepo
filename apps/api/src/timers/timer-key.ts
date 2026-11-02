import { isHeroTrackerName } from "@lootlog/domain/npc-type";
import { getSyntheticNpcId } from "#src/events/kills/get-synthetic-npc-id";

function normalizeTimerNpcName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildTimerKey(npcId: number, npcName: string): string {
  return `${npcId}:${normalizeTimerNpcName(npcName)}`;
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

/**
 * The NPC id a timer is stored under. A Hero Tracker moves to another hiding
 * place each round and may get another runtime id there, but only one tracker
 * of each name exists on a world, so its timer is keyed by the name.
 */
export function getTimerNpcId(npc: { id: number; name: string }): number {
  return isHeroTrackerName(npc.name)
    ? getSyntheticNpcId(`hero-tracker:${normalizeTimerNpcName(npc.name)}`)
    : npc.id;
}
