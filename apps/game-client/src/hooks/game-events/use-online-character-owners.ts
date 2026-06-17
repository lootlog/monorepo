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
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";
import { useEffect, useRef } from "react";

function getCurrentCharacterId(): string | null {
  try {
    return String(Game.hero.id);
  } catch {
    return null;
  }
}

function getCurrentWorld(): string | undefined {
  try {
    return Game.getWorldName();
  } catch {
    return undefined;
  }
}

export function useOnlineCharacterOwners(): void {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const guildIdByCharId = useSettingsStore((state) => state.guildIdByCharId);
  const worldByGuildId = useSettingsStore((state) => state.worldByGuildId);
  const currentCharacterId = getCurrentCharacterId();
  const selectedGuildId = currentCharacterId
    ? guildIdByCharId[currentCharacterId]
    : undefined;
  const selectedWorld = selectedGuildId
    ? (worldByGuildId[selectedGuildId] ?? getCurrentWorld())
    : undefined;
  const { connected, joined, socket } = useSocket();
  const { data: guildMembersByUserId } = useGuildMembersSummary(
    { guildId: selectedGuildId ?? "" },
    {
      query: {
        enabled:
          isShiftPressed &&
          Boolean(selectedGuildId) &&
          selectedGuildId !== "all",
        select: mapGuildMembersByUserId,
      },
    },
  );
  const guildMembersByUserIdRef = useRef(guildMembersByUserId);
  const selectedGuildIdRef = useRef(selectedGuildId);
  const selectedWorldRef = useRef(selectedWorld);
  const requestIdRef = useRef(0);

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
    useOnlineCharacterOwnersStore.getState().clearOwners();
  }, [selectedGuildId, selectedWorld]);

  useEffect(() => {
    if (
      !isShiftPressed ||
      !joined ||
      !connected ||
      !socket ||
      !selectedGuildId ||
      selectedGuildId === "all" ||
      !selectedWorld
    ) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    void requestServerPresence(socket, selectedGuildId, selectedWorld)
      .then((response) => {
        if (requestIdRef.current !== currentRequestId) return;
        if (!response || response.status === "forbidden") {
          useOnlineCharacterOwnersStore.getState().clearOwners();
          return;
        }

        useOnlineCharacterOwnersStore
          .getState()
          .setPresenceResponse(
            normalizePresenceResponse(response.players),
            guildMembersByUserIdRef.current,
          );
      })
      .catch(() => {
        if (requestIdRef.current === currentRequestId) {
          useOnlineCharacterOwnersStore.getState().clearOwners();
        }
      });
  }, [
    connected,
    isShiftPressed,
    joined,
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
