import { useEffect, useState } from "react";
import { isWhoIsHereOpen } from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore } from "@/store/others.store";
import { isShownByGame } from "./air-tag-game-visibility";
import { airTagReceiveController } from "./air-tag-receive-controller";
import { AIR_TAG_TARGET_TTL_MS } from "./air-tag-renderer";
import {
  selectUnseenAirTagEnemies,
  type WhoIsHereAirTagEnemy,
} from "./who-is-here-air-tag-enemies";

const AGE_TICK_MS = 1_000;

/** Live presence of every joined Organization on this world; cached per socket. */
function getMemberSources() {
  const world = useGameStore.getState().game?.world;
  const { joinedGuilds } = useGlobalStore.getState().socketState;

  if (!world || joinedGuilds.length === 0) return [];
  const socket = getSocket();

  return joinedGuilds.map((guildId) =>
    getPlayersPresenceSource(socket, guildId, world),
  );
}

function readUnseenEnemies(now: number) {
  const members = getMemberSources();

  const candidates = selectUnseenAirTagEnemies(
    airTagReceiveController.getRenderableTargets(now, AIR_TAG_TARGET_TTL_MS),
    { now, ttlMs: AIR_TAG_TARGET_TTL_MS, isShownByGame },
  );

  return {
    // Members of another Margonem clan in the same Organization can be reported as enemies.
    enemies: candidates.filter(
      (enemy) =>
        !members.some((source) => source.isOnlineMember(enemy.targetId)),
    ),
    hasCandidates: candidates.length > 0,
  };
}

/** What a row shows, apart from its age; positions change far more often. */
const getRowsSignature = (enemies: readonly WhoIsHereAirTagEnemy[]) =>
  enemies
    .map(
      (enemy) =>
        `${enemy.targetId}|${enemy.nickname}|${enemy.lvl}|${enemy.clan?.id}|${enemy.stasis}|${enemy.effectiveRelation}`,
    )
    .join(",");

/**
 * Unseen AirTag enemies on the current map. AirTag and presence updates
 * re-render only when a row changes; ages tick each second while the window
 * is open.
 */
export function useWhoIsHereAirTagEnemies() {
  // A fresh object re-renders even when two reads fall in the same millisecond.
  const [{ now }, setClock] = useState(() => ({ now: Date.now() }));

  // Re-read when a player comes into sight or the Organizations change.
  useOthersStore((state) => state.othersById);
  useGameStore((state) => state.game?.hero.characterId);
  const world = useGameStore((state) => state.game?.world);

  const joinedGuilds = useGlobalStore(
    (state) => state.socketState.joinedGuilds,
  );

  const { enemies, hasCandidates } = readUnseenEnemies(now);

  useEffect(() => {
    let frame: number | null = null;
    let signature = getRowsSignature(readUnseenEnemies(Date.now()).enemies);

    const check = () => {
      frame = null;
      const next = getRowsSignature(readUnseenEnemies(Date.now()).enemies);

      if (next === signature) return;
      signature = next;
      setClock({ now: Date.now() });
    };

    const schedule = () => {
      frame ??= window.requestAnimationFrame(check);
    };

    const unsubscribe = airTagReceiveController.subscribe(schedule);

    // Only while enemies are reported: loading presence costs a request per Organization.
    const releaseMembers = hasCandidates
      ? getMemberSources().map((source) => source.subscribeChanges(schedule))
      : [];

    return () => {
      unsubscribe();

      for (const release of releaseMembers) release();

      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hasCandidates, joinedGuilds, world]);

  const hasEnemies = enemies.length > 0;

  useEffect(() => {
    if (!hasEnemies) return;

    const interval = window.setInterval(() => {
      if (isWhoIsHereOpen()) setClock({ now: Date.now() });
    }, AGE_TICK_MS);

    return () => window.clearInterval(interval);
  }, [hasEnemies]);

  return { enemies, now };
}
