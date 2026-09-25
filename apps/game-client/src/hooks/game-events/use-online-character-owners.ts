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

// Owners survive Shift releases for the same Organization, world and
// connection. Within this window a new press reuses them; after it the press
// shows them while it refetches.
const OWNERS_FRESH_MS = 30_000;

type OwnersHydration = {
  guildId: string;
  loadedAt: number | null;
  pending: boolean;
  socket: NonNullable<ReturnType<typeof useSocket>["socket"]>;
  world: string;
};

// A request is unnecessary while one is in flight or owners loaded recently.
function needsOwnersRequest(hydration: OwnersHydration | null): boolean {
  if (hydration?.pending) return false;

  const loadedAt = hydration?.loadedAt ?? null;

  return (
    loadedAt === null ||
    Date.now() - loadedAt >= OWNERS_FRESH_MS ||
    useOnlineCharacterOwnersStore.getState().status !== "success"
  );
}

function hydrateOnlineCharacterOwners({
  guildId,
  guildMembersByUserIdRef,
  onSettled,
  requestIdRef,
  socket,
  world,
}: {
  guildId: string;
  guildMembersByUserIdRef: { current: GuildMembersByUserId };
  onSettled: (loaded: boolean) => void;
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
        onSettled(false);

        return;
      }

      if (response.status === "forbidden") {
        useOnlineCharacterOwnersStore.getState().setForbidden();
        onSettled(false);

        return;
      }

      useOnlineCharacterOwnersStore
        .getState()
        .setPresenceResponse(
          normalizePresenceResponse(response.players),
          guildMembersByUserIdRef.current,
        );
      onSettled(true);
    })
    .catch(() => {
      if (requestIdRef.current === currentRequestId) {
        useOnlineCharacterOwnersStore.getState().setError();
        onSettled(false);
      }
    });
}

export function useOnlineCharacterOwners(): void {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );

  const selectedGuildId = useSelectedLootlogGuildId();
  const active = isShiftPressed && isConcreteLootlogGuildId(selectedGuildId);

  const selectedWorldSetting = useSettingsStore((state) =>
    active ? state.worldByGuildId[selectedGuildId] : undefined,
  );

  const selectedWorld = active
    ? (selectedWorldSetting ?? getCurrentWorld())
    : undefined;

  const { connected, joined, socket } = useSocket();

  const { data: guildMembersByUserId } = useGuildMembersSummary(
    { guildId: selectedGuildId ?? "" },
    {
      query: {
        enabled: active,
        select: mapGuildMembersByUserId,
      },
    },
  );

  const guildMembersByUserIdRef = useRef(guildMembersByUserId);
  const selectedGuildIdRef = useRef(selectedGuildId);
  const selectedWorldRef = useRef(selectedWorld);
  const requestIdRef = useRef(0);
  const hydrationRef = useRef<OwnersHydration | null>(null);

  useEffect(() => {
    guildMembersByUserIdRef.current = guildMembersByUserId;

    if (!active) return;
    useOnlineCharacterOwnersStore
      .getState()
      .setGuildMembers(guildMembersByUserId);
  }, [active, guildMembersByUserId]);

  useEffect(() => {
    selectedGuildIdRef.current = selectedGuildId;
    selectedWorldRef.current = selectedWorld;
  }, [selectedGuildId, selectedWorld]);

  useEffect(() => {
    const cached = hydrationRef.current;

    // Cached owners belong to one Organization, world and connection. Drop
    // them as soon as any of these changes, even while Shift is released.
    const cacheUsable =
      cached !== null &&
      joined &&
      connected &&
      cached.socket === socket &&
      cached.guildId === selectedGuildId &&
      (!active || cached.world === selectedWorld);

    if (!cacheUsable) {
      requestIdRef.current += 1;
      hydrationRef.current = null;
      useOnlineCharacterOwnersStore.getState().clearOwners();
    }

    if (
      !joined ||
      !connected ||
      !active ||
      !socket ||
      !selectedGuildId ||
      selectedGuildId === "all" ||
      !selectedWorld
    ) {
      return;
    }

    const current = hydrationRef.current;

    if (!needsOwnersRequest(current)) return;

    const hydration: OwnersHydration = current ?? {
      guildId: selectedGuildId,
      loadedAt: null,
      pending: false,
      socket,
      world: selectedWorld,
    };

    hydration.pending = true;
    hydrationRef.current = hydration;
    hydrateOnlineCharacterOwners({
      guildId: selectedGuildId,
      guildMembersByUserIdRef,
      onSettled: (loaded) => {
        hydration.pending = false;
        hydration.loadedAt = loaded ? Date.now() : null;
      },
      requestIdRef,
      socket,
      world: selectedWorld,
    });
  }, [connected, active, joined, selectedGuildId, selectedWorld, socket]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      hydrationRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!active || !socket || !connected || !joined) return;

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
  }, [active, connected, joined, socket]);
}
