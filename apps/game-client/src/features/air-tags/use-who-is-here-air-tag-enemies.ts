import { useEffect, useRef, useState } from "react";
import {
  getWhoIsHereAirTagHost,
  isWhoIsHereOpen,
} from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore } from "@/store/others.store";
import { isSeenByHero, showsAirTagsOnMap } from "./air-tag-game-visibility";
import { airTagReceiveController } from "./air-tag-receive-controller";
import {
  selectUnseenAirTagEnemies,
  type WhoIsHereAirTagEnemy,
} from "./who-is-here-air-tag-enemies";

const AIR_TAG_TARGET_TTL_MS = 10_000;

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

type WhoIsHereAirTagView = {
  enemies: WhoIsHereAirTagEnemy[];
  /** Where the rows render; resolved only while there are rows to show. */
  host: HTMLElement | null;
  /** Unseen enemies are reported, before members of the Organizations are removed. */
  hasCandidates: boolean;
  /** Any player is reported on this red map, so a step can change the rows. */
  hasTargets: boolean;
  now: number;
  /** What the rows show, apart from their age; positions change far more often. */
  signature: string;
};

const EMPTY_VIEW: WhoIsHereAirTagView = {
  enemies: [],
  host: null,
  hasCandidates: false,
  hasTargets: false,
  now: 0,
  signature: "",
};

const getRowsSignature = (enemies: readonly WhoIsHereAirTagEnemy[]) =>
  enemies
    .map(
      (enemy) =>
        `${enemy.targetId}|${enemy.nickname}|${enemy.lvl}|${enemy.clan?.id}|${enemy.stasis}|${enemy.effectiveRelation}`,
    )
    .join(",");

function readView(now: number): WhoIsHereAirTagView {
  if (!showsAirTagsOnMap()) return { ...EMPTY_VIEW, now };

  const targets = airTagReceiveController.getRenderableTargets(
    now,
    AIR_TAG_TARGET_TTL_MS,
  );

  const candidates = selectUnseenAirTagEnemies(targets, {
    now,
    ttlMs: AIR_TAG_TARGET_TTL_MS,
    isSeenByHero,
  });

  const members = candidates.length > 0 ? getMemberSources() : [];

  // Members of another Margonem clan in the same Organization can be reported as enemies.
  const enemies = candidates.filter(
    (enemy) => !members.some((source) => source.isOnlineMember(enemy.targetId)),
  );

  return {
    enemies,
    host: enemies.length > 0 ? getWhoIsHereAirTagHost() : null,
    hasCandidates: candidates.length > 0,
    hasTargets: targets.length > 0,
    now,
    signature: getRowsSignature(enemies),
  };
}

const showsSameRows = (
  current: WhoIsHereAirTagView,
  next: WhoIsHereAirTagView,
) =>
  current.signature === next.signature &&
  current.host === next.host &&
  current.hasCandidates === next.hasCandidates &&
  current.hasTargets === next.hasTargets;

/**
 * Unseen AirTag enemies on the current map. Reads happen at most once a frame
 * after AirTag, presence or game updates, and re-render only when a row
 * changes; ages tick each second while the window is open.
 */
export function useWhoIsHereAirTagEnemies() {
  const [view, setView] = useState(EMPTY_VIEW);
  // Compared outside setView, so a read that changes nothing does not render.
  const shown = useRef(EMPTY_VIEW);

  const show = (next: WhoIsHereAirTagView) => {
    shown.current = next;
    setView(next);
  };

  const { hasCandidates, hasTargets } = view;
  const world = useGameStore((state) => state.game?.world);

  const joinedGuilds = useGlobalStore(
    (state) => state.socketState.joinedGuilds,
  );

  useEffect(() => {
    let frame: number | null = null;

    const check = () => {
      frame = null;
      const next = readView(Date.now());

      if (!showsSameRows(shown.current, next)) show(next);
    };

    const schedule = () => {
      frame ??= window.requestAnimationFrame(check);
    };

    // Re-read when the map turns red, or, while players are reported, when
    // the hero or a player moves into sight.
    const releaseGame = useGameStore.subscribe(({ game }, { game: before }) => {
      if (
        game?.map.pvp !== before?.map.pvp ||
        (hasTargets &&
          (game?.hero.x !== before?.hero.x ||
            game?.hero.y !== before?.hero.y ||
            game?.hero.characterId !== before?.hero.characterId ||
            game?.map.visibility !== before?.map.visibility))
      ) {
        schedule();
      }
    });

    const releaseOthers = hasTargets
      ? useOthersStore.subscribe(({ othersById }, before) => {
          if (othersById !== before.othersById) schedule();
        })
      : undefined;

    const releaseAirTags = airTagReceiveController.subscribe(schedule);

    // Only while enemies are reported: loading presence costs a request per Organization.
    const releaseMembers = hasCandidates
      ? getMemberSources().map((source) => source.subscribeChanges(schedule))
      : [];

    schedule();

    return () => {
      releaseGame();
      releaseOthers?.();
      releaseAirTags();

      for (const release of releaseMembers) release();

      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hasCandidates, hasTargets, joinedGuilds, world]);

  const hasEnemies = view.enemies.length > 0;

  useEffect(() => {
    if (!hasEnemies) return;

    const interval = window.setInterval(() => {
      if (isWhoIsHereOpen()) show(readView(Date.now()));
    }, AGE_TICK_MS);

    return () => window.clearInterval(interval);
  }, [hasEnemies]);

  return view;
}
