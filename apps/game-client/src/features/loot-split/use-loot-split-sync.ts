import type { GameEvent } from "@lootlog/margonem/game-events";
import type { LootSplitEvent } from "@lootlog/schema/loot-split";
import { useEffect, useRef } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import type { AppSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { usePartyStore } from "@/store/party.store";
import {
  applyGameCommand,
  applyGameEvent,
  applyRemoteChoices,
  changedOwnSplits,
  EMPTY_LOOT_SPLIT_STATE,
  type LootSplit,
  type LootSplitState,
} from "./loot-split-model";
import { lootSplitStore } from "./loot-split-store";

/**
 * Choice changes within this window leave as one frame; an accept leaves at
 * once, because it is what the party waits for.
 */
const CHOICES_COALESCE_MS = 150;

const isLootSplitPacket = (event: GameEvent | undefined) =>
  event?.loot !== undefined || event?.chat?.channels?.system !== undefined;

const readContext = () => {
  const hero = useGameStore.getState().game?.hero;

  if (!hero) return null;

  return {
    at: Date.now(),
    heroId: hero.characterId,
    party: usePartyStore.getState().members.map((member) => ({
      characterId: member.characterId,
      name: member.name,
      profession: member.profession ?? "",
    })),
  };
};

/** Starts over when another character plays, so splits never mix heroes. */
const forHero = (state: LootSplitState, heroId: string) =>
  state.heroId === null || state.heroId === heroId
    ? state
    : EMPTY_LOOT_SPLIT_STATE;

/**
 * Follows the hero's group loot splits from game packets and outgoing
 * commands, shares the hero's choices with the other participants, and
 * merges theirs. Solo loots and splits without other participants never
 * reach the gateway.
 */
export const useLootSplitSync = () => {
  const { socket, connected, joined } = useSocket();
  const online = Boolean(socket && connected && joined);
  const socketRef = useRef<AppSocket | null>(null);
  const pendingSends = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    socketRef.current = online ? socket : null;
  }, [online, socket]);

  useEffect(() => {
    const pending = pendingSends.current;

    const sendNow = (splitId: string) => {
      pending.delete(splitId);
      const current = socketRef.current;
      const { state } = lootSplitStore.getSnapshot();
      const split = state.splits.find(({ id }) => id === splitId);
      const view = state.heroId ? split?.views[state.heroId] : undefined;

      if (!current?.supportsLootSplit() || !split || !view) return;

      const recipientCharacterIds = split.participants
        .map(({ characterId }) => characterId)
        .filter((characterId) => characterId !== state.heroId);

      if (recipientCharacterIds.length === 0) return;

      current.emit(GatewayEvent.LOOT_SPLIT_SEND, {
        splitId: split.id,
        choices: view.choices,
        accepted: view.accepted,
        recipientCharacterIds,
      });
    };

    const share = (splits: readonly LootSplit[], heroId: string | null) => {
      for (const split of splits) {
        // Nobody else takes part, so nobody needs the frame.
        if (split.participants.length <= 1) continue;

        const scheduled = pending.get(split.id);

        if (scheduled !== undefined) clearTimeout(scheduled);

        if (heroId && split.views[heroId]?.accepted) sendNow(split.id);
        else
          pending.set(
            split.id,
            setTimeout(() => sendNow(split.id), CHOICES_COALESCE_MS),
          );
      }
    };

    const unsubscribeProjected = runtimeEventPipeline.subscribeProjected(
      (envelope) => {
        if (!isLootSplitPacket(envelope.raw) || !envelope.raw) return;

        const context = readContext();

        if (!context) return;
        const event = envelope.raw;

        const { previous, next } = lootSplitStore.update((state) =>
          applyGameEvent(forHero(state, context.heroId), event, context),
        );

        share(changedOwnSplits(previous, next), next.heroId);
      },
    );

    const unsubscribeCommand = margonemRuntimeBridge.subscribeCommand(
      (command) => {
        if (!command.startsWith("loot&")) return;

        const { previous, next } = lootSplitStore.update((state) =>
          applyGameCommand(state, command),
        );

        share(changedOwnSplits(previous, next), next.heroId);
      },
    );

    return () => {
      unsubscribeProjected();
      unsubscribeCommand();

      for (const timer of pending.values()) clearTimeout(timer);

      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!online || !socket) return;

    const handleChoices = (event: LootSplitEvent) => {
      const world = useGameStore.getState().game?.world;

      if (event.world !== world) return;

      lootSplitStore.update((state) => applyRemoteChoices(state, event));
    };

    socket.on(GatewayEvent.LOOT_SPLIT_RECEIVE, handleChoices);

    return () => {
      socket.off(GatewayEvent.LOOT_SPLIT_RECEIVE, handleChoices);
    };
  }, [online, socket]);
};
