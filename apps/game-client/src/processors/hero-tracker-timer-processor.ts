import { createAutoTimer } from "@/api/timers.api";
import { isSignedOut } from "@/lib/auth-client";
import { getFreshCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import { getNpcRespawnMultiplier } from "@/lib/margonem-runtime/adapters/world-config-runtime-adapter";
import type {
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
} from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { getEntranceClosesAt } from "@/utils/game/hero-tracker-entrance";
import { isHeroTrackerName } from "@lootlog/domain/npc-type";
import {
  getHeroTrackerRespBaseSeconds,
  isSameHeroTrackerEntrance,
} from "@lootlog/domain/timers";
import type { GameEvent } from "@lootlog/margonem/game-events";

type EventNpc = NonNullable<GameEvent["npcs"]>[number];

type ClaimedTracker = {
  readonly entranceClosesAt: number;
  readonly entranceSecondsLeft: number;
  readonly icon: string;
  readonly level: number;
  readonly name: string;
  readonly npc: EventNpc;
  readonly respawnRandomness: number | undefined;
};

const findClaimedTracker = (
  npc: EventNpc,
  event: GameEvent,
  ingress: RuntimeIngressSnapshot | undefined,
): ClaimedTracker | null => {
  const entranceClosesAt = getEntranceClosesAt(npc.killSeconds, undefined);

  if (entranceClosesAt === undefined || npc.killSeconds === undefined)
    return null;

  const template = event.npc_tpls?.find(({ id }) => id === npc.tpl);

  const known =
    ingress?.npcsById[npc.id] ?? useNpcsStore.getState().getNpc(npc.id);

  const name = template?.nick ?? known?.name;
  const level = template?.level ?? known?.level;

  if (!name || !level || !isHeroTrackerName(name)) return null;

  return {
    entranceClosesAt,
    entranceSecondsLeft: npc.killSeconds,
    icon: known?.icon ?? "",
    level,
    name,
    npc,
    respawnRandomness: template?.resp_rand ?? known?.respawnRandomness,
  };
};

export class HeroTrackerTimerProcessor {
  private readonly reportedEntrances = new Map<number, number>();

  handle(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    const game = ingress?.game ?? useGameStore.getState().game;

    if (!game || isSignedOut()) return;

    for (const npc of event.npcs ?? []) {
      const tracker = findClaimedTracker(npc, event, ingress);

      if (tracker && this.isNewEntrance(tracker)) this.report(tracker, game);
    }
  }

  private isNewEntrance({ npc, entranceClosesAt }: ClaimedTracker): boolean {
    const reported = this.reportedEntrances.get(npc.id);

    return (
      reported === undefined ||
      !isSameHeroTrackerEntrance(reported, entranceClosesAt)
    );
  }

  private report(tracker: ClaimedTracker, game: RuntimeGameSnapshot): void {
    const { accountId, characterId } = game.hero;
    const { npc } = tracker;

    if (
      getFreshCharacterCatchingGuildIds(accountId, characterId)?.length === 0
    ) {
      return;
    }

    this.reportedEntrances.set(npc.id, tracker.entranceClosesAt);

    createAutoTimer({
      respawnRandomness: tracker.respawnRandomness,
      respBaseSeconds: getHeroTrackerRespBaseSeconds(getNpcRespawnMultiplier()),
      entranceSecondsLeft: tracker.entranceSecondsLeft,
      characterId,
      accountId,
      world: game.world,
      gameVersion: game.gameVersion ?? undefined,
      npc: {
        icon: tracker.icon,
        id: npc.id,
        templateId: npc.tpl,
        prof: "",
        wt: 0,
        hpp: 0,
        type: 0,
        lvl: tracker.level,
        name: tracker.name,
        location: game.map.name,
        mapId: game.map.id,
        x: npc.x,
        y: npc.y,
      },
    }).catch((error) => {
      this.reportedEntrances.delete(npc.id);
      console.warn(
        "[HeroTrackerTimerProcessor] Failed to create timer:",
        error,
      );
    });
  }
}
