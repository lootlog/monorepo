import { isDevMode } from "@/lib/is-dev-mode";
import { useOthersStore, type TrackedOtherPlayer } from "@/store/others.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import type { OtherEventEntry } from "@/types/margonem/game-events/other";
import { useEffectEvent } from "react";

type RuntimeOther = {
  d?: {
    id?: string | number;
    account?: string | number;
  };
};

const parseRuntimeOther = (
  runtimeId: string,
  runtimeOther: RuntimeOther,
): TrackedOtherPlayer | null => {
  const characterId = runtimeOther.d?.id;
  const accountId = runtimeOther.d?.account;

  if (characterId === undefined || accountId === undefined) {
    return null;
  }

  return {
    runtimeId,
    characterId: String(characterId),
    accountId: String(accountId),
  };
};

const parseEventOther = (
  runtimeId: string,
  eventOtherEntry: OtherEventEntry,
): TrackedOtherPlayer | null => {
  if (eventOtherEntry.action !== "CREATE") {
    return null;
  }

  if (eventOtherEntry.account === undefined) {
    return null;
  }

  return {
    runtimeId,
    characterId: String(eventOtherEntry.id ?? runtimeId),
    accountId: String(eventOtherEntry.account),
  };
};

export const useOtherHandler = () => {
  const setPlayers = useOthersStore((s) => s.setPlayers);
  const upsertPlayers = useOthersStore((s) => s.upsertPlayers);
  const removePlayersByRuntimeIds = useOthersStore(
    (s) => s.removePlayersByRuntimeIds,
  );
  const clearPlayers = useOthersStore((s) => s.clearPlayers);
  const appendDebugLog = useOthersStore((s) => s.appendDebugLog);

  const handleOtherEvent = useEffectEvent((event: GameEvent) => {
    const hasTrackingClear = event.tracking?.action === "CLEAR";
    const hasTownChange = event.town !== undefined;
    const shouldClearPlayers = hasTrackingClear || hasTownChange;

    if (shouldClearPlayers) {
      if (isDevMode) {
        appendDebugLog({
          source: "event",
          type: "handleOtherEvent.clear",
          details: {
            hasTrackingClear,
            hasTownChange,
            hasOtherPayload: event.other !== undefined,
          },
        });
      }

      clearPlayers();
    }

    if (!event.other) {
      if (isDevMode) {
        appendDebugLog({
          source: "event",
          type: "handleOtherEvent.noOtherPayload",
          details: {
            hasTrackingClear,
            hasTownChange,
          },
        });
      }

      return;
    }

    const createdPlayers: TrackedOtherPlayer[] = [];
    const removedRuntimeIds: string[] = [];
    let skippedNoAction = 0;
    let skippedUnsupportedAction = 0;
    let skippedCreateWithoutAccount = 0;

    for (const [runtimeId, eventOtherEntry] of Object.entries(event.other)) {
      if (eventOtherEntry?.del === 1) {
        removedRuntimeIds.push(runtimeId);
        continue;
      }

      if (eventOtherEntry.action === undefined) {
        skippedNoAction += 1;
        continue;
      }

      if (eventOtherEntry.action !== "CREATE") {
        skippedUnsupportedAction += 1;
        continue;
      }

      if (eventOtherEntry.account === undefined) {
        skippedCreateWithoutAccount += 1;
        continue;
      }

      const createdPlayer = parseEventOther(runtimeId, eventOtherEntry);
      if (createdPlayer) {
        createdPlayers.push(createdPlayer);
      }
    }

    if (removedRuntimeIds.length > 0) {
      removePlayersByRuntimeIds(removedRuntimeIds);
    }

    if (createdPlayers.length > 0) {
      upsertPlayers(createdPlayers);
    }

    if (isDevMode) {
      appendDebugLog({
        source: "event",
        type: "handleOtherEvent.summary",
        details: {
          totalEntries: Object.keys(event.other).length,
          createdCount: createdPlayers.length,
          deletedCount: removedRuntimeIds.length,
          skippedNoAction,
          skippedUnsupportedAction,
          skippedCreateWithoutAccount,
          createdRuntimeIds: createdPlayers.map((player) => player.runtimeId),
          deletedRuntimeIds: removedRuntimeIds,
        },
      });
    }
  });

  const handleInitialOthersDetection = useEffectEvent(() => {
    try {
      const runtimeOthers = window.Engine?.others?.check?.() as
        | Record<string, RuntimeOther>
        | undefined;

      if (!runtimeOthers) {
        if (isDevMode) {
          appendDebugLog({
            source: "runtime",
            type: "handleInitialOthersDetection.emptyRuntimeOthers",
          });
        }

        clearPlayers();
        return;
      }

      const players = Object.entries(runtimeOthers).reduce<
        TrackedOtherPlayer[]
      >((acc, [runtimeId, runtimeOther]) => {
        const parsed = parseRuntimeOther(runtimeId, runtimeOther);
        if (parsed) {
          acc.push(parsed);
        }

        return acc;
      }, []);

      setPlayers(players);

      if (isDevMode) {
        appendDebugLog({
          source: "runtime",
          type: "handleInitialOthersDetection.snapshot",
          details: {
            runtimeOthersCount: Object.keys(runtimeOthers).length,
            parsedPlayersCount: players.length,
          },
        });
      }
    } catch (error) {
      console.warn("Failed to get initial other players:", error);
      if (isDevMode) {
        appendDebugLog({
          source: "runtime",
          type: "handleInitialOthersDetection.error",
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      clearPlayers();
    }
  });

  return {
    handleOtherEvent,
    handleInitialOthersDetection,
  };
};
