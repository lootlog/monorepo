import type { OrganizationAccessPolicy } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { delay, randomInt } from "es-toolkit";
import type {
  BasicPresence,
  PresenceWithLocation,
} from "@lootlog/client/realtime";
import type { AppSocket } from "@/lib/socket";

export type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

export type PlayerPresence = {
  discordId: string;
  sessionId?: string;
  platform?: "game" | "web-app";
  status?: "online" | "offline";
  guildId?: string;
  mapName?: string;
  isAfk: boolean;
  margonemAccountVerified?: boolean;
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

export type PlayerPresenceAck =
  | {
      status: "success";
      players: PlayerPresenceResponse;
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

export const applyPresenceUpdates = (
  previous: PlayerPresenceResponse,
  updates: readonly PlayerPresence[],
): PlayerPresenceResponse => {
  let next = previous;

  for (const update of updates) {
    const presenceKey = getPresenceKey(update);
    const currentAccountPresences = next[update.discordId] ?? [];
    let updatedAccountPresences: PlayerPresence[] | undefined;

    if (update.status === "offline") {
      const filteredPresences = currentAccountPresences.filter((presence) =>
        update.sessionId
          ? presence.sessionId !== update.sessionId
          : getPresenceKey(presence) !== presenceKey,
      );

      if (filteredPresences.length === currentAccountPresences.length) {
        continue;
      }

      updatedAccountPresences = filteredPresences;
    } else {
      if (!update.player) continue;

      const existingPresenceIndex = currentAccountPresences.findIndex(
        (presence) => getPresenceKey(presence) === presenceKey,
      );

      if (existingPresenceIndex === -1) {
        updatedAccountPresences = [...currentAccountPresences, update];
      } else {
        updatedAccountPresences = [...currentAccountPresences];
        updatedAccountPresences[existingPresenceIndex] = {
          ...currentAccountPresences[existingPresenceIndex],
          ...update,
          player: update.player,
          mapName: update.mapName,
        };
      }
    }

    if (next === previous) {
      next = { ...previous };
    }

    if (updatedAccountPresences.length === 0) {
      delete next[update.discordId];
    } else {
      next[update.discordId] = updatedAccountPresences;
    }
  }

  return next;
};

/** One Lootlog's online players entry for a gateway presence. */
export const toPlayerPresence = (
  organizationId: string,
  presence: BasicPresence | PresenceWithLocation,
): PlayerPresence => {
  const location = "location" in presence ? presence.location : undefined;
  const { character } = presence;

  return {
    discordId: presence.discordId ?? presence.userId,
    guildId: organizationId,
    sessionId: presence.sessionId,
    platform: presence.platform,
    status: presence.status,
    mapName: location?.map,
    isAfk: presence.isAfk,
    margonemAccountVerified: presence.confidence === "verified",
    updatedAt: presence.lastSeen,
    player: character && {
      world: character.world,
      name: character.name,
      lvl: character.lvl,
      icon: character.icon,
      characterId: character.characterId,
      accountId: character.accountId,
      prof: character.prof,
      clan: character.clan,
      location: location && { x: location.x, y: location.y, map: location.map },
    },
  };
};

/** The departure of one session, as a delta announces it. */
export const toOfflinePlayerPresence = (
  organizationId: string,
  change: { discordId?: string; userId: string; sessionId: string },
): PlayerPresence => ({
  discordId: change.discordId ?? change.userId,
  guildId: organizationId,
  sessionId: change.sessionId,
  status: "offline",
  isAfk: false,
});

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

/** Game presences of one Lootlog by Discord account, one per character. */
export const toPlayerPresenceResponse = (
  organizationId: string,
  presences: ReadonlyArray<BasicPresence | PresenceWithLocation>,
): PlayerPresenceResponse => {
  const byAccount = Object.groupBy(
    presences.flatMap((presence) =>
      presence.platform === "game"
        ? [toPlayerPresence(organizationId, presence)]
        : [],
    ),
    (player) => player.discordId,
  );

  return Object.fromEntries(
    Object.entries(byAccount).map(([discordId, players = []]) => [
      discordId,
      dedupePresences(players),
    ]),
  );
};

export const ONLINE_PLAYERS_PRESENCE_ACK_TIMEOUT_MS = 5_000;

// A timed-out fetch usually means a saturated gateway. Spread the retries so a
// burst of joining clients does not return at the same moment.
const PRESENCE_RETRY_MIN_DELAY_MS = 1_000;

const PRESENCE_RETRY_MAX_DELAY_MS = 3_000;

export const requestServerPresence = async (
  socket: Pick<AppSocket, "fetchPresence">,
  guildId: string,
  world: string,
) => {
  const requestPresence = () =>
    socket.fetchPresence(
      guildId,
      world,
      ONLINE_PLAYERS_PRESENCE_ACK_TIMEOUT_MS,
    );

  try {
    return await requestPresence();
  } catch {
    await delay(
      randomInt(PRESENCE_RETRY_MIN_DELAY_MS, PRESENCE_RETRY_MAX_DELAY_MS),
    );

    return requestPresence();
  }
};

// The gateway lists every permission an owner or administrator holds, and
// leaves out presence where this character does not publish its own, so the
// listed permissions alone decide.
export const canReadPresence = (
  policy: OrganizationAccessPolicy | undefined,
): boolean =>
  policy?.permissions.includes(Permission.LOOTLOG_ONLINE_PLAYERS_READ) ?? false;

export const canReadPresenceLocation = (
  policy: OrganizationAccessPolicy | undefined,
): boolean =>
  canReadPresence(policy) &&
  (policy?.permissions.includes(Permission.LOOTLOG_PRESENCE_LOCATION_READ) ??
    false);

export const filterPresenceByPolicy = (
  players: PlayerPresenceResponse,
  policy: OrganizationAccessPolicy | undefined,
): PlayerPresenceResponse => {
  if (!canReadPresence(policy)) return {};

  if (canReadPresenceLocation(policy)) return players;

  return Object.fromEntries(
    Object.entries(players).map(([id, presences]) => [
      id,
      presences.map(({ mapName: _mapName, ...presence }) => {
        if (!presence.player) return presence;
        const { location: _location, ...player } = presence.player;

        return { ...presence, player };
      }),
    ]),
  );
};
