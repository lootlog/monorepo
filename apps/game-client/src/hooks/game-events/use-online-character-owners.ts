import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useGameStore } from "@/store/game.store";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import {
  normalizePresence,
  normalizePresenceResponse,
  requestServerPresence,
  type PlayerPresenceUpdatePayload,
} from "@/lib/online-players-presence";
import { measureLootlogCallback } from "@/lib/performance-monitoring/measured-callback";
import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import {
  type GuildMembersByUserId,
  useOnlineCharacterOwnersStore,
} from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";
import { useEffect, useRef } from "react";

function getCurrentWorld(): string | undefined {
  return useGameStore.getState().game?.world;
}

function hydrateOnlineCharacterOwners({
  guildId,
  guildMembersByUserId,
  requestIdRef,
  socket,
  world,
}: {
  guildId: string;
  guildMembersByUserId: GuildMembersByUserId;
  requestIdRef: { current: number };
  socket: Parameters<typeof requestServerPresence>[0];
  world: string;
}): void {
  const currentRequestId = ++requestIdRef.current;
  useOnlineCharacterOwnersStore.getState().setLoading();

  void requestServerPresence(socket, guildId, world)
    .then((response) => {
      if (requestIdRef.current !== currentRequestId) return;
      if (!response) {
        useOnlineCharacterOwnersStore.getState().setError();
        return;
      }
      if (response.status === "forbidden") {
        useOnlineCharacterOwnersStore.getState().setForbidden();
        return;
      }

      useOnlineCharacterOwnersStore
        .getState()
        .setPresenceResponse(
          normalizePresenceResponse(response.players),
          guildMembersByUserId,
        );
    })
    .catch(() => {
      if (requestIdRef.current === currentRequestId) {
        useOnlineCharacterOwnersStore.getState().setError();
      }
    });
}

export function useOnlineCharacterOwners(): void {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const worldByGuildId = useSettingsStore((state) => state.worldByGuildId);
  const selectedGuildId = useSelectedLootlogGuildId();
  const selectedWorld = isConcreteLootlogGuildId(selectedGuildId)
    ? (worldByGuildId[selectedGuildId] ?? getCurrentWorld())
    : undefined;
  const { connected, joined, socket } = useSocket();
  const { data: guildMembersByUserId } = useGuildMembersSummary(
    { guildId: selectedGuildId ?? "" },
    {
      query: {
        enabled: isShiftPressed && isConcreteLootlogGuildId(selectedGuildId),
        select: mapGuildMembersByUserId,
      },
    },
  );
  const guildMembersByUserIdRef = useRef(guildMembersByUserId);
  const selectedGuildIdRef = useRef(selectedGuildId);
  const selectedWorldRef = useRef(selectedWorld);
  const requestIdRef = useRef(0);
  const activeHydrationKeyRef = useRef<string | null>(null);
  const activeHydrationSocketRef = useRef(socket);

  useEffect(() => {
    guildMembersByUserIdRef.current = guildMembersByUserId;
    useOnlineCharacterOwnersStore
      .getState()
      .setGuildMembers(guildMembersByUserId);
  }, [guildMembersByUserId]);

  useEffect(() => {
    selectedGuildIdRef.current = selectedGuildId;
    selectedWorldRef.current = selectedWorld;
  }, [selectedGuildId, selectedWorld]);

  useEffect(() => {
    if (
      !joined ||
      !connected ||
      !isShiftPressed ||
      !socket ||
      !selectedGuildId ||
      selectedGuildId === "all" ||
      !selectedWorld
    ) {
      requestIdRef.current += 1;
      activeHydrationKeyRef.current = null;
      activeHydrationSocketRef.current = socket;
      useOnlineCharacterOwnersStore.getState().clearOwners();
      return;
    }

    const hydrationKey = `${selectedGuildId}\u0000${selectedWorld}`;
    if (
      activeHydrationKeyRef.current === hydrationKey &&
      activeHydrationSocketRef.current === socket
    ) {
      return;
    }

    activeHydrationKeyRef.current = hydrationKey;
    activeHydrationSocketRef.current = socket;
    useOnlineCharacterOwnersStore.getState().clearOwners();
    hydrateOnlineCharacterOwners({
      guildId: selectedGuildId,
      guildMembersByUserId: guildMembersByUserIdRef.current,
      requestIdRef,
      socket,
      world: selectedWorld,
    });
  }, [
    connected,
    isShiftPressed,
    joined,
    selectedGuildId,
    selectedWorld,
    socket,
  ]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      activeHydrationKeyRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!isShiftPressed || !socket || !connected || !joined) return;

    const handleOnlinePlayersPresenceUpdate = measureLootlogCallback(
      "socket.online-character-owners-update",
      (data: PlayerPresenceUpdatePayload) => {
        const normalizedPresence = normalizePresence(data);

        if (
          normalizedPresence.guildId !== selectedGuildIdRef.current ||
          normalizedPresence.player?.world !== selectedWorldRef.current
        ) {
          return;
        }

        const store = useOnlineCharacterOwnersStore.getState();
        if (normalizedPresence.status === "offline") {
          store.removePresence(normalizedPresence);
          return;
        }

        store.upsertPresence(
          normalizedPresence,
          guildMembersByUserIdRef.current,
        );
      },
    );

    socket.on(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      handleOnlinePlayersPresenceUpdate,
    );

    return () => {
      socket.off(
        GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        handleOnlinePlayersPresenceUpdate,
      );
    };
  }, [connected, isShiftPressed, joined, socket]);
}
