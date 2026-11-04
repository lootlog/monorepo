import type { GameEvent } from "@lootlog/margonem/game-events";
import type {
  LootSplitAutoAcceptedEvent,
  LootSplitEvent,
} from "@lootlog/schema/loot-split";
import { useEffect, useRef } from "react";
import { GatewayEvent } from "@/config/gateway";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import type { AppSocket } from "@/lib/socket";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useGameStore } from "@/store/game.store";
import { usePartyStore } from "@/store/party.store";
import {
  applyGameCommand,
  applyGameEvent,
  applyRemoteChoices,
  applyRemoteFilterAccept,
  changedOwnSplits,
  EMPTY_LOOT_SPLIT_STATE,
  fillParticipants,
  openOwnSplits,
  ownLootFilterAcceptRecipients,
  type LootSplit,
  type LootSplitContext,
  type LootSplitState,
} from "./loot-split-model";
import { lootSplitStore } from "./loot-split-store";
import { useLootSplitSocket } from "./use-loot-split-socket";

/**
 * Choice changes within this window leave as one frame; an accept leaves at
 * once, because it is what the party waits for.
 */
const CHOICES_COALESCE_MS = 150;

/** A Margonem party holds at most ten characters. */
const MAX_RECIPIENTS = 9;

// Loot, the chat that closes a split, a fight start that closes the window,
// and the battle log that names a drop the loot filter took.
const isLootSplitPacket = (event: GameEvent | undefined) =>
  event?.loot !== undefined ||
  event?.chat?.channels?.system !== undefined ||
  event?.f?.init !== undefined ||
  event?.f?.m !== undefined;

const readContext = (): LootSplitContext | null => {
  const hero = useGameStore.getState().game?.hero;

  if (!hero) return null;

  return {
    at: Date.now(),
    heroId: hero.characterId,
    party: usePartyStore.getState().members.map((member) => ({
      characterId: member.characterId,
      name: member.name,
    })),
    // Players are the battle's positive warrior ids.
    fighters: new Set(
      Object.keys(useBattleStore.getState().battleWarriors).filter(
        (id) => !id.startsWith("-"),
      ),
    ),
  };
};

/** Starts over when another character plays, so splits never mix heroes. */
const forHero = (state: LootSplitState, heroId: string) =>
  state.heroId === null || state.heroId === heroId
    ? state
    : EMPTY_LOOT_SPLIT_STATE;

const sendOwnView = (socket: AppSocket, splitId: string) => {
  const { state } = lootSplitStore.getSnapshot();
  const split = state.splits.find(({ id }) => id === splitId);
  const view = state.heroId ? split?.views[state.heroId] : undefined;

  if (!split || !view) return;

  const recipientCharacterIds = split.participants
    .map(({ characterId }) => characterId)
    .filter((characterId) => characterId !== state.heroId);

  // Nobody else takes part, so nobody needs the frame.
  if (recipientCharacterIds.length === 0) return;

  socket.emit(GatewayEvent.LOOT_SPLIT_SEND, {
    splitId: split.id,
    choices: view.choices,
    accepted: view.accepted,
    recipientCharacterIds,
  });
};

/**
 * Follows the hero's group loot splits from game packets and outgoing
 * commands, shares the hero's choices with the other participants, and
 * merges theirs. When the hero's loot filter accepts a split, which the game
 * keeps from this client, the fight's other players learn of it. Solo loots
 * and splits without other participants never reach the gateway.
 */
export const useLootSplitSync = () => {
  const socket = useLootSplitSocket();
  const socketRef = useRef<AppSocket | null>(null);
  const pendingSends = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = pendingSends.current;

    const sendNow = (splitId: string) => {
      pending.delete(splitId);

      if (socketRef.current) sendOwnView(socketRef.current, splitId);
    };

    const share = (splits: readonly LootSplit[], heroId: string | null) => {
      for (const split of splits) {
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
        const event = envelope.raw;

        if (!event || !isLootSplitPacket(event)) return;

        const context = readContext();

        if (!context) return;

        const { previous, next } = lootSplitStore.update((state) =>
          applyGameEvent(forHero(state, context.heroId), event, context),
        );

        share(changedOwnSplits(previous, next), next.heroId);

        const recipientCharacterIds = ownLootFilterAcceptRecipients(
          event,
          context,
        );

        // Not queued while offline: the split is over within seconds.
        if (
          recipientCharacterIds &&
          socketRef.current?.supportsLootSplitAutoAccept()
        )
          socketRef.current.emit(GatewayEvent.LOOT_SPLIT_AUTO_ACCEPT_SEND, {
            recipientCharacterIds: recipientCharacterIds.slice(
              0,
              MAX_RECIPIENTS,
            ),
          });
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

    const unsubscribeParty = usePartyStore.subscribe((party, previous) => {
      if (party.members === previous.members) return;

      const context = readContext();

      if (context)
        lootSplitStore.update((state) => fillParticipants(state, context));
    });

    return () => {
      unsubscribeProjected();
      unsubscribeCommand();
      unsubscribeParty();

      for (const timer of pending.values()) clearTimeout(timer);

      pending.clear();
    };
  }, []);

  useEffect(() => {
    socketRef.current = socket;

    if (!socket) return;

    // Frames dropped while offline are not queued; the latest state is
    // shared again as soon as the gateway can relay it.
    for (const split of openOwnSplits(lootSplitStore.getSnapshot().state))
      sendOwnView(socket, split.id);

    const handleChoices = (event: LootSplitEvent) => {
      if (event.world !== useGameStore.getState().game?.world) return;

      lootSplitStore.update((state) => applyRemoteChoices(state, event));
    };

    const handleFilterAccept = (event: LootSplitAutoAcceptedEvent) => {
      if (event.world !== useGameStore.getState().game?.world) return;

      lootSplitStore.update((state) =>
        applyRemoteFilterAccept(state, event.sender.characterId, Date.now()),
      );
    };

    socket.on(GatewayEvent.LOOT_SPLIT_RECEIVE, handleChoices);
    socket.on(GatewayEvent.LOOT_SPLIT_AUTO_ACCEPT_RECEIVE, handleFilterAccept);

    return () => {
      socket.off(GatewayEvent.LOOT_SPLIT_RECEIVE, handleChoices);
      socket.off(
        GatewayEvent.LOOT_SPLIT_AUTO_ACCEPT_RECEIVE,
        handleFilterAccept,
      );
    };
  }, [socket]);
};
