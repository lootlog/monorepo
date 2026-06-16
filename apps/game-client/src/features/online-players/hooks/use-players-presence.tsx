import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useEffect, useRef, useState } from "react";

type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

type RawPlayerPresencePayload = {
  world?: string;
  name?: string;
  lvl?: number | string;
  icon?: string;
  characterId?: string;
  accountId?: string;
  prof?: string;
  clan?: {
    id?: number;
    name?: string;
    rank?: number;
  };
  mapName?: string;
  sessionId?: string;
  isAfk?: boolean;
  updatedAt?: number;
  location?: {
    x?: number;
    y?: number;
    map?: string;
  };
};

export type PlayerPresence = {
  discordId: string;
  sessionId?: string;
  platform?: "game" | "web-app";
  status?: "online" | "offline";
  guildId?: string;
  mapName?: string;
  isAfk: boolean;
  updatedAt?: number;
  player?: {
    world: string;
    name: string;
    lvl: number;
    icon: string;
    characterId: string;
    accountId: string;
    prof: string;
    clan?: {
      id?: number;
      name?: string;
      rank?: number;
    };
    location?: {
      x?: number;
      y?: number;
      map: string;
    };
  };
};

type PlayerPresenceUpdatePayload = {
  discordId: string;
  sessionId?: string;
  platform?: "game" | "web-app";
  status?: "online" | "offline";
  guildId?: string;
  player?: RawPlayerPresencePayload;
  playerPresence?: RawPlayerPresencePayload;
};

type PlayerPresenceResponsePayload = Record<
  string,
  PlayerPresenceUpdatePayload[]
>;

export type OnlinePlayersAccessState = "allowed" | "forbidden";

type PlayerPresenceAckPayload =
  | {
      status: "success";
      players: PlayerPresenceResponsePayload;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

const getPresenceKey = (presence: PlayerPresence) => {
  if (!presence.player?.accountId || !presence.player.characterId) {
    return "web-app";
  }

  return `${presence.player.accountId}-${presence.player.characterId}`;
};

const normalizePresenceLevel = (level?: number | string) => {
  if (typeof level === "number" && Number.isFinite(level)) {
    return level;
  }

  if (typeof level === "string") {
    const parsedLevel = Number.parseInt(level, 10);

    if (Number.isFinite(parsedLevel)) {
      return parsedLevel;
    }
  }

  return 0;
};

const normalizePresencePlayer = (player?: RawPlayerPresencePayload) => {
  if (!player) {
    return undefined;
  }

  const mapName = player.mapName ?? player.location?.map;

  return {
    world: player.world ?? "",
    name: player.name ?? "",
    lvl: normalizePresenceLevel(player.lvl),
    icon: player.icon ?? "",
    characterId: player.characterId ?? "",
    accountId: player.accountId ?? "",
    prof: player.prof ?? "",
    clan: player.clan,
    location: mapName
      ? {
          x: player.location?.x,
          y: player.location?.y,
          map: mapName,
        }
      : undefined,
  };
};

const normalizePresence = (
  presence: PlayerPresenceUpdatePayload,
): PlayerPresence => {
  const rawPlayerPresence = presence.playerPresence
    ? {
        ...presence.player,
        ...presence.playerPresence,
      }
    : presence.player;
  const normalizedPlayer = normalizePresencePlayer(rawPlayerPresence);

  return {
    discordId: presence.discordId,
    guildId: presence.guildId,
    platform: presence.platform,
    sessionId:
      presence.sessionId ??
      presence.playerPresence?.sessionId ??
      presence.player?.sessionId,
    status: presence.status,
    mapName:
      rawPlayerPresence?.mapName ??
      normalizedPlayer?.location?.map ??
      undefined,
    isAfk: rawPlayerPresence?.isAfk ?? false,
    updatedAt: rawPlayerPresence?.updatedAt,
    player: normalizedPlayer,
  };
};

const shouldReplacePresence = (
  currentPresence: PlayerPresence | undefined,
  nextPresence: PlayerPresence,
) => {
  if (!currentPresence) return true;

  return (nextPresence.updatedAt ?? 0) >= (currentPresence.updatedAt ?? 0);
};

const dedupePresences = (presences: PlayerPresence[]) => {
  const presencesByKey = new Map<string, PlayerPresence>();

  for (const presence of presences) {
    if (!presence.player) continue;

    const key = getPresenceKey(presence);

    if (shouldReplacePresence(presencesByKey.get(key), presence)) {
      presencesByKey.set(key, presence);
    }
  }

  return [...presencesByKey.values()];
};

const normalizePresenceResponse = (
  response: PlayerPresenceResponsePayload,
): PlayerPresenceResponse => {
  return Object.fromEntries(
    Object.entries(response).map(([discordId, presences]) => [
      discordId,
      dedupePresences(
        presences.map((presence) =>
          normalizePresence({
            ...presence,
            discordId,
          }),
        ),
      ),
    ]),
  );
};

const requestServerPresence = (
  socket: { emitWithAck: unknown },
  guildId: string,
  world: string,
) => {
  return (
    socket.emitWithAck as (
      event: GatewayEvent,
      data: { guildId: string; world: string },
    ) => Promise<PlayerPresenceAckPayload | undefined>
  )(GatewayEvent.REQUEST_SERVER_PRESENCE, {
    guildId,
    world,
  });
};

export const usePlayersPresence = (
  selectedGuildId?: string,
  world?: string,
): [
  PlayerPresenceResponse,
  boolean,
  React.Dispatch<React.SetStateAction<PlayerPresenceResponse>>,
  OnlinePlayersAccessState,
] => {
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [accessState, setAccessState] =
    useState<OnlinePlayersAccessState>("allowed");
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const { joined, connected, socket } = useSocket();

  const selectedGuildIdRef = useRef(selectedGuildId);
  const worldRef = useRef(world);
  const requestIdRef = useRef(0);

  useEffect(() => {
    selectedGuildIdRef.current = selectedGuildId;
    worldRef.current = world;
  }, [selectedGuildId, world]);

  useEffect(() => {
    if (!selectedGuildId || !world) {
      setOnlinePlayers({});
      setLoading(false);
      setAccessState("allowed");
      return;
    }

    if (
      !joined ||
      !connected ||
      !socket ||
      !selectedGuildIdRef.current ||
      !world
    )
      return;

    const currentRequestId = ++requestIdRef.current;
    setOnlinePlayers({});
    setAccessState("allowed");
    setLoading(true);

    requestServerPresence(socket, selectedGuildIdRef.current, world)
      .then((data) => {
        // ignore stale responses
        if (requestIdRef.current !== currentRequestId) return;

        if (!data) {
          return;
        }

        if (data.status === "forbidden") {
          setOnlinePlayers({});
          setAccessState("forbidden");
          return;
        }

        setOnlinePlayers(normalizePresenceResponse(data.players));
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      });
  }, [joined, connected, socket, world, selectedGuildId, permissionsVersion]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handlePresenceUpdate = (data: PlayerPresenceUpdatePayload) => {
      const normalizedPresence = normalizePresence(data);

      if (
        normalizedPresence.guildId !== selectedGuildIdRef.current ||
        normalizedPresence.player?.world !== worldRef.current
      )
        return;

      setOnlinePlayers((prev) => {
        const updated = structuredClone(prev);
        const key = getPresenceKey(normalizedPresence);
        const list = updated[normalizedPresence.discordId] || [];

        if (normalizedPresence.status === "offline") {
          const newList = list.filter((p) => getPresenceKey(p) !== key);
          if (newList.length > 0) {
            updated[normalizedPresence.discordId] = newList;
          } else {
            delete updated[normalizedPresence.discordId];
          }

          return updated;
        }

        if (!normalizedPresence.player) {
          return prev;
        }

        const existingPresenceIndex = list.findIndex(
          (presence) => getPresenceKey(presence) === key,
        );

        if (existingPresenceIndex === -1) {
          updated[normalizedPresence.discordId] = [...list, normalizedPresence];
          return updated;
        }

        updated[normalizedPresence.discordId][existingPresenceIndex] = {
          ...list[existingPresenceIndex],
          ...normalizedPresence,
          player: normalizedPresence.player,
          mapName: normalizedPresence.mapName,
        };

        return updated;
      });
    };

    socket.on(GatewayEvent.UPDATE_SERVER_PRESENCE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.UPDATE_SERVER_PRESENCE, handlePresenceUpdate);
    };
  }, [socket, joined, connected]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handlePermissionsUpdated = () => {
      setOnlinePlayers({});
      setPermissionsVersion((version) => version + 1);
    };

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, joined, connected]);

  return [onlinePlayers, loading, setOnlinePlayers, accessState];
};
