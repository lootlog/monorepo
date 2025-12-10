import type { Platform } from 'src/gateway/enums/platform.enum';
import type { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import type { Socket as SocketIOSocket } from 'socket.io';
import type { UserGuildData } from 'src/guilds/types/guild.types';

export type SubscriptionMode = 'all' | 'single';

export type SocketUserPlayerLocation = {
  x: number;
  y: number;
  map: string;
};

export type SocketUserPlayer = {
  world: string;
  name: string;
  characterId: string;
  accountId: string;
  icon: string;
  lvl: string;
  prof: string;
  location: SocketUserPlayerLocation;
  clanName?: string;
  clanId?: number;
};

/**
 * @deprecated Use PlayerPresence instead. Kept for backward compatibility.
 */
export type EventPresence = {
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;
};

/**
 * Full player presence data including character information.
 * Supports multiple characters per user (one per socket session).
 */
export type PlayerPresence = {
  // Player data (from SocketUserPlayer)
  world: string;
  name: string;
  characterId: string;
  accountId: string;
  icon: string;
  lvl: string;
  prof: string;

  // Location/presence data
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;

  // Session identifier (for multi-character support)
  sessionId: string;
};

export type SocketUser = {
  discordId: string;
  sessionId: string;
  userId: string;
  platform: Platform;
  player?: SocketUserPlayer;
  status?: UserPresenceStatus;
  guilds?: UserGuildData[];
  /** @deprecated Use playerPresence instead */
  eventPresence?: EventPresence;
  /** Full player presence with character data */
  playerPresence?: PlayerPresence;
  subscriptionMode: SubscriptionMode;
  activeGuildId?: string;
};

export type Socket = SocketIOSocket & { data: SocketUser };
