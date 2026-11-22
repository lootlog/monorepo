import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { isSeenByHero, showsAirTagsOnMap } from "./air-tag-game-visibility";
import { airTagReceiveController } from "./air-tag-receive-controller";
import {
  selectUnseenAirTagEnemies,
  type WhoIsHereAirTagEnemy,
} from "./who-is-here-air-tag-enemies";

export const AIR_TAG_TARGET_TTL_MS = 10_000;

/** Live presence of every joined Organization on this world; cached per socket. */
export function getAirTagMemberSources() {
  const world = useGameStore.getState().game?.world;
  const { joinedGuilds } = useGlobalStore.getState().socketState;

  if (!world || joinedGuilds.length === 0) return [];
  const socket = getSocket();

  return joinedGuilds.map((guildId) =>
    getPlayersPresenceSource(socket, guildId, world),
  );
}

export type UnseenAirTagEnemies = {
  enemies: WhoIsHereAirTagEnemy[];
  /** Unseen enemies are reported, before members of the Organizations are removed. */
  hasCandidates: boolean;
  /** Any player is reported on this map. */
  hasTargets: boolean;
};

const NONE: UnseenAirTagEnemies = {
  enemies: [],
  hasCandidates: false,
  hasTargets: false,
};

/**
 * Enemies other members see on this map and the hero does not: what the
 * players window lists and the minimap draws. Empty off a red map.
 */
export function readUnseenAirTagEnemies(now: number): UnseenAirTagEnemies {
  if (!showsAirTagsOnMap()) return NONE;

  const targets = airTagReceiveController.getRenderableTargets(
    now,
    AIR_TAG_TARGET_TTL_MS,
  );

  if (targets.length === 0) return NONE;

  const candidates = selectUnseenAirTagEnemies(targets, {
    now,
    ttlMs: AIR_TAG_TARGET_TTL_MS,
    isSeenByHero,
  });

  // Loading presence costs a request per Organization, so only once enemies are reported.
  const members = candidates.length > 0 ? getAirTagMemberSources() : [];

  return {
    // Members of another Margonem clan in the same Organization can be reported as enemies.
    enemies: candidates.filter(
      (enemy) =>
        !members.some((source) => source.isOnlineMember(enemy.targetId)),
    ),
    hasCandidates: candidates.length > 0,
    hasTargets: true,
  };
}
