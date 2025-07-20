import { Platform } from 'src/gateway/enums/platform.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { Socket as SocketIOSocket } from 'socket.io';

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
};

export type SocketUser = {
  discordId: string;
  sessionId: string;
  userId: string;
  platform: Platform;
  player?: SocketUserPlayer;
  status?: UserPresenceStatus;
};

export type Socket = SocketIOSocket & { user: SocketUser };
