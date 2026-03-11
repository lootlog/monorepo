import type { Platform } from "src/gateway/enums/platform.enum";
import type { UserPresenceStatus } from "src/gateway/enums/user-presence-status.enum";
import type { Socket as SocketIOSocket } from "socket.io";
import type { UserGuildData } from "src/guilds/types/guild.types";

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
  playerPresence?: PlayerPresence;
};

export type Socket = SocketIOSocket & { data: SocketUser };
