import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useEffect, useMemo, useRef, useState } from "react";

type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

export type PlayerPresence = {
  discordId: string;
  sessionId?: string;
  platform: "game" | "web-app";
  status: "online" | "offline";
  guildId: string;
  guildIds?: string[];
  player?: {
    world: string;
    name: string;
    lvl: number;
    icon: string;
    characterId: string;
    accountId: string;
    prof: string;
    location: {
      x: number;
      y: number;
      map: string;
    };
  };
};

const getPresenceKey = (presence: PlayerPresence) => {
  if (!presence.player) return "web-app";
  return `${presence.player.accountId}-${presence.player.characterId}`;
};

const normalizeGuildIds = (guildIds: unknown): string[] => {
  if (!Array.isArray(guildIds)) {
    return [];
  }

  return Array.from(
    new Set(guildIds.filter((guildId): guildId is string => typeof guildId === "string")),
  );
};

const mergeGuildIds = (
  currentGuildIds: string[] | undefined,
  nextGuildIds: string[] | undefined,
): string[] => {
  return Array.from(new Set([...(currentGuildIds ?? []), ...(nextGuildIds ?? [])]));
};

const normalizePresenceResponse = (data: unknown): PlayerPresenceResponse => {
  if (!data || typeof data !== "object") {
    return {};
  }

  const response = data as Record<string, unknown>;
  const normalized: PlayerPresenceResponse = {};

  for (const [discordId, presences] of Object.entries(response)) {
    if (!Array.isArray(presences)) {
      continue;
    }

    const byKey = new Map<string, PlayerPresence>();

    for (const rawPresence of presences) {
      if (!rawPresence || typeof rawPresence !== "object") {
        continue;
      }

      const presence = rawPresence as PlayerPresence;
      const key = getPresenceKey(presence);
      const existing = byKey.get(key);
      const normalizedPresence: PlayerPresence = {
        ...presence,
        guildIds: normalizeGuildIds(presence.guildIds),
      };

      if (!existing) {
        byKey.set(key, normalizedPresence);
        continue;
      }

      byKey.set(key, {
        ...existing,
        ...normalizedPresence,
        guildIds: mergeGuildIds(existing.guildIds, normalizedPresence.guildIds),
      });
    }

    normalized[discordId] = Array.from(byKey.values());
  }

  return normalized;
};

const resolveRequestedGuildIds = (
  selectedGuildId: string | undefined,
  joinedGuilds: string[],
  includeAllJoinedGuilds: boolean,
): string[] => {
  if (includeAllJoinedGuilds) {
    if (joinedGuilds.length > 0) {
      return joinedGuilds;
    }

    return selectedGuildId ? [selectedGuildId] : [];
  }

  if (!selectedGuildId) {
    return [];
  }

  return [selectedGuildId];
};

type UsePlayersPresenceOptions = {
  includeAllJoinedGuilds?: boolean;
};

export const usePlayersPresence = (
  selectedGuildId?: string,
  world?: string,
  options: UsePlayersPresenceOptions = {},
): [
  PlayerPresenceResponse,
  boolean,
  React.Dispatch<React.SetStateAction<PlayerPresenceResponse>>,
] => {
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const { joined, connected, socket, joinedGuilds } = useSocket();
  const includeAllJoinedGuilds = options.includeAllJoinedGuilds === true;

  const requestedGuildIds = useMemo(
    () =>
      resolveRequestedGuildIds(
        selectedGuildId,
        joinedGuilds,
        includeAllJoinedGuilds,
      ),
    [includeAllJoinedGuilds, joinedGuilds, selectedGuildId],
  );
  const requestedGuildIdsKey = requestedGuildIds.join(",");

  const requestedGuildIdsRef = useRef<string[]>(requestedGuildIds);
  const worldRef = useRef(world);
  const requestIdRef = useRef(0);

  useEffect(() => {
    requestedGuildIdsRef.current = requestedGuildIds;
    worldRef.current = world;
  }, [requestedGuildIds, world]);

  useEffect(() => {
    if (!joined || !connected || !socket || !world || requestedGuildIds.length === 0) {
      setOnlinePlayers({});
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    const requestPayload =
      requestedGuildIds.length === 1
        ? { guildId: requestedGuildIds[0], world }
        : { guildIds: requestedGuildIds, world };
    const emitPresenceRequest = socket.emitWithAck as (
      event: GatewayEvent.REQUEST_SERVER_PRESENCE,
      payload: { guildId?: string; guildIds?: string[]; world: string },
    ) => Promise<unknown>;

    emitPresenceRequest(GatewayEvent.REQUEST_SERVER_PRESENCE, requestPayload)
      .then((data) => {
        // ignore stale responses
        if (requestIdRef.current !== currentRequestId) return;

        if (data) {
          setOnlinePlayers(normalizePresenceResponse(data));
        } else {
          setOnlinePlayers({});
        }
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (requestIdRef.current === currentRequestId) {
          setOnlinePlayers({});
        }
      });
  }, [joined, connected, socket, world, requestedGuildIds, requestedGuildIdsKey]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handlePresenceUpdate = (data: PlayerPresence) => {
      const currentGuildIds = requestedGuildIdsRef.current;
      if (!currentGuildIds.includes(data.guildId)) {
        return;
      }

      if (
        !worldRef.current ||
        data.player?.world !== worldRef.current
      ) {
        return;
      }

      setOnlinePlayers((prev) => {
        const updated = structuredClone(prev);
        const key = getPresenceKey(data);
        const list = updated[data.discordId] || [];

        if (data.status === "offline") {
          const newList = list.filter((p) => getPresenceKey(p) !== key);
          if (newList.length > 0) {
            updated[data.discordId] = newList;
          } else {
            delete updated[data.discordId];
          }
        } else if (data.status === "online") {
          const existingIndex = list.findIndex((p) => getPresenceKey(p) === key);
          const normalizedData: PlayerPresence = {
            ...data,
            guildIds: normalizeGuildIds(data.guildIds),
          };

          if (existingIndex === -1) {
            updated[data.discordId] = [...list, normalizedData];
          } else {
            const existing = list[existingIndex];
            const mergedPresence: PlayerPresence = {
              ...existing,
              ...normalizedData,
              guildIds: mergeGuildIds(existing.guildIds, normalizedData.guildIds),
            };

            const nextList = [...list];
            nextList[existingIndex] = mergedPresence;
            updated[data.discordId] = nextList;
          }
        }

        return updated;
      });
    };

    socket.on(GatewayEvent.UPDATE_SERVER_PRESENCE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.UPDATE_SERVER_PRESENCE, handlePresenceUpdate);
    };
  }, [socket, joined, connected]);

  return [onlinePlayers, loading, setOnlinePlayers];
};
