import { GatewayEvent } from "@/config/gateway";

export type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

export type RawPlayerPresencePayload = {
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

export type PlayerPresenceUpdatePayload = {
  discordId: string;
  sessionId?: string;
  platform?: "game" | "web-app";
  status?: "online" | "offline";
  guildId?: string;
  player?: RawPlayerPresencePayload;
  playerPresence?: RawPlayerPresencePayload;
};

export type PlayerPresenceResponsePayload = Record<
  string,
  PlayerPresenceUpdatePayload[]
>;

export type PlayerPresenceAckPayload =
  | {
      status: "success";
      players: PlayerPresenceResponsePayload;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

export const getPresenceKey = (presence: PlayerPresence) => {
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

export const normalizePresence = (
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

export const normalizePresenceResponse = (
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

export const requestServerPresence = (
  socket: { emitWithAck: unknown },
  guildId: string,
  world: string,
) => {
  return (
    socket.emitWithAck as (
      event: GatewayEvent,
      data: { guildId: string; world: string },
    ) => Promise<PlayerPresenceAckPayload | undefined>
  )(GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH, {
    guildId,
    world,
  });
};
