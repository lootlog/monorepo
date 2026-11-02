import { HERO_TRACKER_RESP_BASE_SECONDS } from "@/constants/margonem";
import { createAutoTimer } from "@/api";
import { isSignedOut } from "@/lib/auth-client";
import { getFreshCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import type {
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
} from "@/lib/margonem-runtime/runtime.types";
import { useNpcsStore } from "@/store/npcs.store";
import { getEntranceClosesAt } from "@/utils/game/hero-tracker-entrance";
import { isHeroTrackerName } from "@lootlog/domain/npc-type";
import type { GameEvent } from "@lootlog/margonem/game-events";

// Every player on the map sees the same countdown; one report per entrance is
// enough, and the API merges reports from other players.
const SAME_ENTRANCE_TOLERANCE_MS = 60_000;

type EventNpc = NonNullable<GameEvent["npcs"]>[number];

type ClaimedTracker = {
  readonly entranceClosesAt: number;
  readonly icon: string;
  readonly level: number;
  readonly name: string;
  readonly npc: EventNpc;
  readonly respawnRandomness: number | undefined;
};

/** A Hero Tracker in the packet whose countdown just started or restarted. */
const findClaimedTracker = (
  npc: EventNpc,
  event: GameEvent,
  ingress: RuntimeIngressSnapshot,
): ClaimedTracker | null => {
  const entranceClosesAt = getEntranceClosesAt(npc.killSeconds, undefined);

  if (entranceClosesAt === undefined) return null;

  const template = event.npc_tpls?.find(({ id }) => id === npc.tpl);

  const known =
    ingress.npcsById[npc.id] ?? useNpcsStore.getState().getNpc(npc.id);

  const name = template?.nick ?? known?.name;
  const level = template?.level ?? known?.level;

  if (!name || !level || !isHeroTrackerName(name)) return null;

  return {
    entranceClosesAt,
    icon: known?.icon ?? "",
    level,
    name,
    npc,
    respawnRandomness: template?.resp_rand ?? known?.respawnRandomness,
  };
};

/**
 * Starts a Hero Tracker timer when its colossus entrance opens: the timer
 * counts the entrance down, then the tracker's respawn after it closes.
 */
export class HeroTrackerTimerProcessor {
  private readonly reportedEntrances = new Map<number, number>();

  handle(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    const game = ingress?.game;

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
      Math.abs(reported - entranceClosesAt) >= SAME_ENTRANCE_TOLERANCE_MS
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
      respBaseSeconds: HERO_TRACKER_RESP_BASE_SECONDS,
      entranceClosesAt: new Date(tracker.entranceClosesAt),
      characterId,
      accountId,
      world: game.world,
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
