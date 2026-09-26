import { useSocket } from "@/contexts/socket-context";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useGameStore } from "@/store/game.store";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import type { AppSocket } from "@/lib/socket";
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
  socket: AppSocket;
  world: string;
}): void {
  const currentRequestId = ++requestIdRef.current;
  useOnlineCharacterOwnersStore.getState().setLoading();

  const source = getPlayersPresenceSource(socket, guildId, world);
  const snapshot = source.getSnapshot();

  const fresh =
    snapshot.isCurrent &&
    source.loadedAt !== null &&
    Date.now() - source.loadedAt < OWNERS_FRESH_MS;

  const request = fresh ? Promise.resolve(snapshot) : source.refresh();
  void request
    .then((response) => {
      if (requestIdRef.current !== currentRequestId) return;

      if (response.error) {
        useOnlineCharacterOwnersStore.getState().setError();
        onSettled(false);

        return;
      }

      if (response.accessState === "forbidden") {
        useOnlineCharacterOwnersStore.getState().setForbidden();
        onSettled(false);

        return;
      }

      useOnlineCharacterOwnersStore
        .getState()
        .setPresenceResponse(
          response.onlinePlayers,
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
    if (
      !active ||
      !socket ||
      !connected ||
      !joined ||
      !selectedGuildId ||
      !selectedWorld
    )
      return;

    const source = getPlayersPresenceSource(
      socket,
      selectedGuildId,
      selectedWorld,
    );

    return source.subscribeChanges((presence) => {
      const store = useOnlineCharacterOwnersStore.getState();

      if (!presence) {
        const snapshot = source.getSnapshot();

        if (snapshot.accessState === "forbidden") store.setForbidden();
        else if (
          snapshot.hasLoaded &&
          !snapshot.refreshing &&
          !snapshot.error
        ) {
          store.setPresenceResponse(
            snapshot.onlinePlayers,
            guildMembersByUserIdRef.current,
          );
        }

        return;
      }

      if (presence.status === "offline") store.removePresence(presence);
      else store.upsertPresence(presence, guildMembersByUserIdRef.current);
    }, false);
  }, [active, connected, joined, socket, selectedGuildId, selectedWorld]);
}
