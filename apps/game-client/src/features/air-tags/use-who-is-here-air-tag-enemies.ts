import { useEffect, useState } from "react";
import { isWhoIsHereOpen } from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { airTagReceiveController } from "./air-tag-receive-controller";
import { AIR_TAG_TARGET_TTL_MS } from "./air-tag-renderer";
import {
  selectUnseenAirTagEnemies,
  type WhoIsHereAirTagEnemy,
} from "./who-is-here-air-tag-enemies";

const AGE_TICK_MS = 1_000;

function readUnseenEnemies(now: number): WhoIsHereAirTagEnemy[] {
  const { othersById } = useOthersStore.getState();

  const memberIds = new Set(
    Object.values(
      useOnlineCharacterOwnersStore.getState().ownersByCharacterKey,
    ).flatMap((owner) => (owner ? [owner.characterId] : [])),
  );

  return selectUnseenAirTagEnemies(
    airTagReceiveController.getRenderableTargets(now, AIR_TAG_TARGET_TTL_MS),
    {
      now,
      ttlMs: AIR_TAG_TARGET_TTL_MS,
      heroId: useGameStore.getState().game?.hero.characterId,
      isVisible: (targetId) => othersById[targetId] !== undefined,
      isMember: (targetId) => memberIds.has(targetId),
    },
  );
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
 * Unseen AirTag enemies on the current map. AirTag updates re-render only when
 * a row changes; ages tick each second while the window is open.
 */
export function useWhoIsHereAirTagEnemies() {
  // A fresh object re-renders even when two reads fall in the same millisecond.
  const [{ now }, setClock] = useState(() => ({ now: Date.now() }));

  // Re-read when a player comes into sight or membership changes.
  useOthersStore((state) => state.othersById);
  useOnlineCharacterOwnersStore((state) => state.ownersByCharacterKey);
  useGameStore((state) => state.game?.hero.characterId);

  useEffect(() => {
    let frame: number | null = null;
    let signature = getRowsSignature(readUnseenEnemies(Date.now()));

    const check = () => {
      frame = null;
      const next = getRowsSignature(readUnseenEnemies(Date.now()));

      if (next === signature) return;
      signature = next;
      setClock({ now: Date.now() });
    };

    const unsubscribe = airTagReceiveController.subscribe(() => {
      frame ??= window.requestAnimationFrame(check);
    });

    return () => {
      unsubscribe();

      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const enemies = readUnseenEnemies(now);
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
