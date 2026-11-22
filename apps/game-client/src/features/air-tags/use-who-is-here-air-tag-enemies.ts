import { useEffect, useRef, useState } from "react";
import {
  getWhoIsHereAirTagHost,
  isWhoIsHereOpen,
  subscribeWhoIsHereVisibility,
} from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore } from "@/store/others.store";
import { airTagReceiveController } from "./air-tag-receive-controller";
import {
  getAirTagMemberSources,
  readUnseenAirTagEnemies,
} from "./air-tag-unseen-enemies";
import type { AirTagTarget } from "@lootlog/schema/air-tag";

const AGE_TICK_MS = 1_000;

type WhoIsHereAirTagView = {
  enemies: AirTagTarget[];
  /** Where the rows render; resolved only while there are rows to show. */
  host: HTMLElement | null;
  /** Unseen enemies are reported, before members of the Organizations are removed. */
  hasCandidates: boolean;
  /** Any player is reported on this red map while the window is open, so a step can change the rows. */
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

const getRowsSignature = (enemies: readonly AirTagTarget[]) =>
  enemies
    .map(
      (enemy) =>
        `${enemy.targetId}|${enemy.nickname}|${enemy.lvl}|${enemy.clan?.id}|${enemy.stasis}`,
    )
    .join(",");

function readView(now: number): WhoIsHereAirTagView {
  // A closed window shows no rows, so it costs no reads or presence requests.
  if (!isWhoIsHereOpen()) return { ...EMPTY_VIEW, now };

  const { enemies, hasCandidates, hasTargets } = readUnseenAirTagEnemies(now);

  return {
    enemies,
    host: enemies.length > 0 ? getWhoIsHereAirTagHost() : null,
    hasCandidates,
    hasTargets,
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
 * after AirTag, presence, game or window updates, and re-render only when a
 * row changes; ages tick each second while rows show.
 */
export function useWhoIsHereAirTagEnemies() {
  const [view, setView] = useState(EMPTY_VIEW);
  // Compared outside setView: a no-op updater can still render the hook.
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

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- Cleanup releases every subscription, including the conditional others-store one, and the pending frame.
  useEffect(() => {
    let frame: number | null = null;

    const check = () => {
      frame = null;
      const next = readView(Date.now());

      if (!showsSameRows(shown.current, next)) show(next);
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(check);
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
    const releaseWindow = subscribeWhoIsHereVisibility(schedule);

    // Only while enemies are reported: loading presence costs a request per Organization.
    const releaseMembers = hasCandidates
      ? getAirTagMemberSources().map((source) =>
          source.subscribeChanges(schedule),
        )
      : [];

    schedule();

    return () => {
      releaseGame();
      releaseOthers?.();
      releaseAirTags();
      releaseWindow();

      for (const release of releaseMembers) release();

      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hasCandidates, hasTargets, joinedGuilds, world]);

  const hasEnemies = view.enemies.length > 0;

  useEffect(() => {
    if (!hasEnemies) return;

    const interval = window.setInterval(
      () => show(readView(Date.now())),
      AGE_TICK_MS,
    );

    return () => window.clearInterval(interval);
  }, [hasEnemies]);

  return view;
}
