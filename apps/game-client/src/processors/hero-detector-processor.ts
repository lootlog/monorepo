import {
  HERO_DETECTOR_CHAT_STYLE,
  parseHeroDetectorMessage,
  type HeroDetection,
} from "@lootlog/domain/hero-sightings";
import { getShortnameByProf } from "@lootlog/domain/profession";
import type { ChatEventMsg, GameEvent } from "@lootlog/margonem/game-events";
import { createHeroSighting } from "@/api/hero-sightings.api";
import { upsertHeroSightings } from "@/features/hero-sightings/hero-sightings-cache";
import { getFreshCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import { isSignedOut } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import type { RuntimeGameSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { useHeroSightingsStore } from "@/store/hero-sightings.store";
import { useWindowsStore } from "@/store/windows.store";

/**
 * Margonem re-delivers recent chat history after a login or a reload; an
 * answer older than this was already reported, or is no longer news.
 */
const MAX_DETECTION_AGE_MS = 2 * 60 * 1000;

/** Answers kept to skip repeats; far more than one window of fresh ones. */
const MAX_HANDLED_MESSAGE_IDS = 64;

type DetectorAnswer = {
  readonly message: ChatEventMsg;
  readonly detection: HeroDetection;
};

const readDetectorAnswer = (message: ChatEventMsg): DetectorAnswer | null => {
  if (message.style !== HERO_DETECTOR_CHAT_STYLE || !message.msg) return null;
  const detection = parseHeroDetectorMessage(message.msg);

  return detection ? { message, detection } : null;
};

/**
 * Reports the hero detector's answers in the system chat as hero sightings,
 * then offers the player to claim the hero they found.
 */
export class HeroDetectorProcessor {
  private readonly handledMessageIds = new Set<number>();

  handle(event: GameEvent): void {
    const now = Date.now();
    const messages = event.chat?.channels.system?.msg;

    if (!messages?.length) return;

    for (const message of messages) {
      const answer = readDetectorAnswer(message);

      if (!answer || !this.claimMessage(answer.message, now)) continue;

      const game = useGameStore.getState().game;

      if (!game || isSignedOut()) return;

      this.report(answer, game);
    }
  }

  /** True the first time a fresh answer is seen. */
  private claimMessage({ id, ts }: ChatEventMsg, now: number): boolean {
    if (now - ts * 1000 > MAX_DETECTION_AGE_MS) return false;

    if (this.handledMessageIds.has(id)) return false;
    this.handledMessageIds.add(id);

    if (this.handledMessageIds.size > MAX_HANDLED_MESSAGE_IDS) {
      const [oldest] = this.handledMessageIds;

      if (oldest !== undefined) this.handledMessageIds.delete(oldest);
    }

    return true;
  }

  private report(
    { message, detection }: DetectorAnswer,
    game: RuntimeGameSnapshot,
  ): void {
    const { accountId, characterId } = game.hero;

    if (
      getFreshCharacterCatchingGuildIds(accountId, characterId)?.length === 0
    ) {
      return;
    }

    const prof = detection.heroProf
      ? getShortnameByProf(detection.heroProf)
      : undefined;

    createHeroSighting({
      world: game.world,
      accountId,
      characterId,
      hero: {
        name: detection.heroName,
        lvl: detection.heroLvl,
        ...(prof && { prof }),
      },
      state: detection.state,
      mapName: detection.mapName,
      observedAt: new Date(message.ts * 1000).toISOString(),
    })
      .then(({ submittedGuilds }) => {
        const sightings = submittedGuilds.map(({ sighting }) => sighting);

        if (sightings.length === 0) return;

        upsertHeroSightings(queryClient, sightings);
        useHeroSightingsStore.getState().showOwnDetection({ sightings });
        useWindowsStore.getState().setOpen("hero-sightings", true);
      })
      .catch((error) => {
        console.warn("[HeroDetectorProcessor] Failed to report:", error);
      });
  }
}
