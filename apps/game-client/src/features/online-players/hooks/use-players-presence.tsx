import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useEffect, useMemo, useRef, useState } from "react";

type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

export type PresenceLootlogGuildStatus = {
  timersEnabled: boolean;
  lootEnabled: boolean;
};

export type PresenceLootlogSettings = {
  accountId: string;
  characterId: string;
  guildStatusByGuildId: Record<string, PresenceLootlogGuildStatus>;
};

export type PlayerPresence = {
  discordId: string;
  sessionId?: string;
  platform: "game" | "web-app";
  status: "online" | "offline";
  guildId?: string;
  guildIds?: string[];
  lootlogSettings?: PresenceLootlogSettings;
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

type LegacyPlayerPresenceData = {
  world?: string;
  name?: string;
  lvl?: number | string;
  icon?: string;
  characterId?: string;
  accountId?: string;
  prof?: string;
  mapName?: string;
  sessionId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizePlayer = (
  rawPresence: Record<string, unknown>,
): PlayerPresence["player"] | undefined => {
  const rawPlayer = isRecord(rawPresence.player)
    ? rawPresence.player
    : undefined;
  const rawLegacyPresence = isRecord(rawPresence.playerPresence)
    ? (rawPresence.playerPresence as LegacyPlayerPresenceData)
    : undefined;
  const source = rawPlayer ?? rawLegacyPresence;

  if (!source) {
    return undefined;
  }

  const world = typeof source.world === "string" ? source.world : undefined;
  const name = typeof source.name === "string" ? source.name : undefined;
  const icon = typeof source.icon === "string" ? source.icon : undefined;
  const characterId =
    typeof source.characterId === "string" ? source.characterId : undefined;
  const accountId =
    typeof source.accountId === "string" ? source.accountId : undefined;
  const prof = typeof source.prof === "string" ? source.prof : undefined;
  const lvl = normalizeNumber(source.lvl);

  if (!world || !name || !icon || !characterId || !accountId || !prof) {
    return undefined;
  }

  const rawLocation =
    rawPlayer && isRecord(rawPlayer.location) ? rawPlayer.location : undefined;
  const mapNameFromLocation =
    rawLocation && typeof rawLocation.map === "string"
      ? rawLocation.map
      : undefined;
  const mapNameFromPresence =
    rawLegacyPresence && typeof rawLegacyPresence.mapName === "string"
      ? rawLegacyPresence.mapName
      : undefined;

  return {
    world,
    name,
    lvl: lvl ?? 0,
    icon,
    characterId,
    accountId,
    prof,
    location: {
      x: normalizeNumber(rawLocation?.x) ?? 0,
      y: normalizeNumber(rawLocation?.y) ?? 0,
      map: mapNameFromLocation ?? mapNameFromPresence ?? "",
    },
  };
};

const normalizeLootlogSettings = (
  rawPresence: Record<string, unknown>,
): PresenceLootlogSettings | undefined => {
  const rawLootlogSettings = isRecord(rawPresence.lootlogSettings)
    ? rawPresence.lootlogSettings
    : undefined;

  if (!rawLootlogSettings) {
    return undefined;
  }

  const accountId =
    typeof rawLootlogSettings.accountId === "string"
      ? rawLootlogSettings.accountId
      : undefined;
  const characterId =
    typeof rawLootlogSettings.characterId === "string"
      ? rawLootlogSettings.characterId
      : undefined;
  const rawGuildStatusByGuildId = isRecord(
    rawLootlogSettings.guildStatusByGuildId,
  )
    ? rawLootlogSettings.guildStatusByGuildId
    : undefined;

  if (!accountId || !characterId || !rawGuildStatusByGuildId) {
    return undefined;
  }

  const guildStatusByGuildId: Record<string, PresenceLootlogGuildStatus> = {};

  for (const [guildId, rawGuildStatus] of Object.entries(
    rawGuildStatusByGuildId,
  )) {
    if (!guildId || !isRecord(rawGuildStatus)) {
      continue;
    }

    guildStatusByGuildId[guildId] = {
      timersEnabled: rawGuildStatus.timersEnabled === true,
      lootEnabled: rawGuildStatus.lootEnabled === true,
    };
  }

  return {
    accountId,
    characterId,
    guildStatusByGuildId,
  };
};

const normalizePresence = (
  rawPresence: unknown,
  fallbackDiscordId?: string,
): PlayerPresence | null => {
  if (!isRecord(rawPresence)) {
    return null;
  }

  const discordId =
    typeof rawPresence.discordId === "string"
      ? rawPresence.discordId
      : fallbackDiscordId;

  if (!discordId) {
    return null;
  }

  const platform = rawPresence.platform === "web-app" ? "web-app" : "game";
  const status = rawPresence.status === "offline" ? "offline" : "online";
  const guildId =
    typeof rawPresence.guildId === "string" ? rawPresence.guildId : undefined;
  const guildIds = normalizeGuildIds(rawPresence.guildIds);
  const sessionId =
    typeof rawPresence.sessionId === "string"
      ? rawPresence.sessionId
      : isRecord(rawPresence.playerPresence) &&
          typeof rawPresence.playerPresence.sessionId === "string"
        ? rawPresence.playerPresence.sessionId
        : undefined;

  return {
    discordId,
    sessionId,
    platform,
    status,
    guildId,
    guildIds,
    lootlogSettings: normalizeLootlogSettings(rawPresence),
    player: normalizePlayer(rawPresence),
  };
};

const getPresenceKey = (presence: PlayerPresence) => {
  if (!presence.player) {
    return presence.sessionId ? `session-${presence.sessionId}` : "web-app";
  }

  return `${presence.player.accountId}-${presence.player.characterId}`;
};

const normalizeGuildIds = (guildIds: unknown): string[] => {
  if (!Array.isArray(guildIds)) {
    return [];
  }

  return Array.from(
    new Set(
      guildIds.filter(
        (guildId): guildId is string => typeof guildId === "string",
      ),
    ),
  );
};

const mergeGuildIds = (
  currentGuildIds: string[] | undefined,
  nextGuildIds: string[] | undefined,
): string[] => {
  return Array.from(
    new Set([...(currentGuildIds ?? []), ...(nextGuildIds ?? [])]),
  );
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
      const normalizedPresence = normalizePresence(rawPresence, discordId);
      if (!normalizedPresence) {
        continue;
      }

      const key = getPresenceKey(normalizedPresence);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, normalizedPresence);
        continue;
      }

      byKey.set(key, {
        ...existing,
        ...normalizedPresence,
        guildId: normalizedPresence.guildId ?? existing.guildId,
        player: normalizedPresence.player ?? existing.player,
        sessionId: normalizedPresence.sessionId ?? existing.sessionId,
        guildIds: mergeGuildIds(existing.guildIds, normalizedPresence.guildIds),
        lootlogSettings:
          normalizedPresence.lootlogSettings ?? existing.lootlogSettings,
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
    if (
      !joined ||
      !connected ||
      !socket ||
      !world ||
      requestedGuildIds.length === 0
    ) {
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
    const presenceRequestPromise = (
      (socket.timeout?.(7000) ?? socket) as {
        emitWithAck: (
          event: GatewayEvent.REQUEST_SERVER_PRESENCE,
          payload: { guildId?: string; guildIds?: string[]; world: string },
        ) => Promise<unknown>;
      }
    ).emitWithAck(GatewayEvent.REQUEST_SERVER_PRESENCE, requestPayload);

    presenceRequestPromise
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
  }, [
    joined,
    connected,
    socket,
    world,
    requestedGuildIds,
    requestedGuildIdsKey,
  ]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handlePresenceUpdate = (data: unknown) => {
      const normalizedData = normalizePresence(data);
      if (!normalizedData) {
        return;
      }

      const currentGuildIds = requestedGuildIdsRef.current;
      if (
        !normalizedData.guildId ||
        !currentGuildIds.includes(normalizedData.guildId)
      ) {
        return;
      }

      if (
        !worldRef.current ||
        normalizedData.player?.world !== worldRef.current
      ) {
        return;
      }

      setOnlinePlayers((prev) => {
        const updated = structuredClone(prev);
        const key = getPresenceKey(normalizedData);
        const list = updated[normalizedData.discordId] || [];

        if (normalizedData.status === "offline") {
          const newList = list.filter((p) => getPresenceKey(p) !== key);
          if (newList.length > 0) {
            updated[normalizedData.discordId] = newList;
          } else {
            delete updated[normalizedData.discordId];
          }
        } else if (normalizedData.status === "online") {
          const existingIndex = list.findIndex(
            (p) => getPresenceKey(p) === key,
          );

          if (existingIndex === -1) {
            updated[normalizedData.discordId] = [...list, normalizedData];
          } else {
            const existing = list[existingIndex];
            const mergedPresence: PlayerPresence = {
              ...existing,
              ...normalizedData,
              guildId: normalizedData.guildId ?? existing.guildId,
              player: normalizedData.player ?? existing.player,
              sessionId: normalizedData.sessionId ?? existing.sessionId,
              guildIds: mergeGuildIds(
                existing.guildIds,
                normalizedData.guildIds,
              ),
              lootlogSettings:
                normalizedData.lootlogSettings ?? existing.lootlogSettings,
            };

            const nextList = [...list];
            nextList[existingIndex] = mergedPresence;
            updated[normalizedData.discordId] = nextList;
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
