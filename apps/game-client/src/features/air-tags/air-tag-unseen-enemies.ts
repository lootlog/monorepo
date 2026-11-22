import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { isSeenByHero, showsAirTagsOnMap } from "./air-tag-game-visibility";
import { airTagReceiveController } from "./air-tag-receive-controller";
import type { AirTagTarget } from "@lootlog/schema/air-tag";
import { selectUnseenAirTagEnemies } from "./who-is-here-air-tag-enemies";

export const AIR_TAG_TARGET_TTL_MS = 10_000;

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
  enemies: AirTagTarget[];
  hasCandidates: boolean;
  hasTargets: boolean;
};

const NONE: UnseenAirTagEnemies = {
  enemies: [],
  hasCandidates: false,
  hasTargets: false,
};

export function readUnseenAirTagEnemies(now: number): UnseenAirTagEnemies {
  if (!showsAirTagsOnMap()) return NONE;

  const targets = airTagReceiveController.getRenderableTargets(
    now,
    AIR_TAG_TARGET_TTL_MS,
  );

  if (targets.length === 0) return NONE;

  const candidates = selectUnseenAirTagEnemies(targets, isSeenByHero);

  const members = candidates.length > 0 ? getAirTagMemberSources() : [];

  return {
    enemies: candidates.filter(
      (enemy) =>
        !members.some((source) => source.isOnlineMember(enemy.targetId)),
    ),
    hasCandidates: candidates.length > 0,
    hasTargets: true,
  };
}
