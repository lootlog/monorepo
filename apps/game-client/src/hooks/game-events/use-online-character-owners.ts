import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { Game } from "@/lib/game";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import {
  normalizePresence,
  normalizePresenceResponse,
  requestServerPresence,
  type PlayerPresenceUpdatePayload,
} from "@/lib/online-players-presence";
import {
  getSelectedLootlogGuildId,
  isConcreteLootlogGuildId,
} from "@/lib/selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import {
  type GuildMembersByUserId,
  useOnlineCharacterOwnersStore,
} from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";
import { useEffect, useRef } from "react";

function getCurrentWorld(): string | undefined {
  try {
    return Game.getWorldName();
  } catch {
    return undefined;
  }
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
  const ownersStatus = useOnlineCharacterOwnersStore((state) => state.status);
  const guildIdByCharId = useSettingsStore((state) => state.guildIdByCharId);
  const worldByGuildId = useSettingsStore((state) => state.worldByGuildId);
  const selectedGuildId = getSelectedLootlogGuildId(guildIdByCharId);
  const selectedWorld = isConcreteLootlogGuildId(selectedGuildId)
    ? (worldByGuildId[selectedGuildId] ?? getCurrentWorld())
    : undefined;
  const { connected, joined, socket } = useSocket();
  const { data: guildMembersByUserId } = useGuildMembersSummary(
    { guildId: selectedGuildId ?? "" },
    {
      query: {
        enabled: isConcreteLootlogGuildId(selectedGuildId),
        select: mapGuildMembersByUserId,
      },
    },
  );
  const guildMembersByUserIdRef = useRef(guildMembersByUserId);
  const selectedGuildIdRef = useRef(selectedGuildId);
  const selectedWorldRef = useRef(selectedWorld);
  const requestIdRef = useRef(0);
  const previousShiftPressedRef = useRef(isShiftPressed);

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
      !socket ||
      !selectedGuildId ||
      selectedGuildId === "all" ||
      !selectedWorld
    ) {
      requestIdRef.current += 1;
      useOnlineCharacterOwnersStore.getState().clearOwners();
      return;
    }

    useOnlineCharacterOwnersStore.getState().clearOwners();
    hydrateOnlineCharacterOwners({
      guildId: selectedGuildId,
      guildMembersByUserId: guildMembersByUserIdRef.current,
      requestIdRef,
      socket,
      world: selectedWorld,
    });

    return () => {
      requestIdRef.current += 1;
    };
  }, [connected, joined, selectedGuildId, selectedWorld, socket]);

  useEffect(() => {
    const wasShiftPressed = previousShiftPressedRef.current;
    previousShiftPressedRef.current = isShiftPressed;
    if (
      !isShiftPressed ||
      wasShiftPressed ||
      ownersStatus !== "error" ||
      !joined ||
      !connected ||
      !socket ||
      !selectedGuildId ||
      selectedGuildId === "all" ||
      !selectedWorld
    ) {
      return;
    }

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
    ownersStatus,
    selectedGuildId,
    selectedWorld,
    socket,
  ]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handleOnlinePlayersPresenceUpdate = (
      data: PlayerPresenceUpdatePayload,
    ) => {
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

      store.upsertPresence(normalizedPresence, guildMembersByUserIdRef.current);
    };

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
  }, [connected, joined, socket]);
}
