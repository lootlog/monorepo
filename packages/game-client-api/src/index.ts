import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

export type PublicUser = {
  avatar?: string;
  banner?: string;
  discriminator: string;
  globalName: string;
  id: string;
  username: string;
};

export type PublicMember = {
  id: number;
  userId: string;
  guildId: string;
  avatar?: string | null;
  type: string;
  name: string;
  user?: PublicUser;
  roles?: {
    position: number | null;
    color: number | null;
  }[];
};

export type PublicNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  type: NpcType;
  location?: string;
  margonemType: number;
};

export type PublicGuild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
};

export type PublicTimer = {
  timerKey: string;
  npcId: number;
  npc: PublicNpc;
  member: PublicMember;
  members?: PublicMember[];
  world: string;
  guildId: string;
  minSpawnTime: string;
  maxSpawnTime: string;
  updatedAt: string | null;
  isCustomTime?: boolean;
  isPending?: boolean;
  wasReset?: boolean;
};

export type PublicSocketState = {
  connected: boolean;
  joined: boolean;
  joinedGuilds: string[];
};

export type PublicOnlinePlayerPresence = {
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

export type PublicOnlinePlayers = Record<string, PublicOnlinePlayerPresence[]>;

export type PublicOnlinePlayersResult =
  | {
      status: "success";
      players: PublicOnlinePlayers;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

export type PublicOnlinePlayersChangedEvent = {
  guildId: string;
  world: string;
} & PublicOnlinePlayersResult;

export type ApiEventMap = {
  ready: void;
  "guilds:changed": PublicGuild[] | undefined;
  "timers:changed": {
    world: string;
    guildId: string;
    timers: PublicTimer[];
  };
  "online-players:changed": PublicOnlinePlayersChangedEvent;
  "socket:state-changed": PublicSocketState;
};

export type ApiEventName = keyof ApiEventMap;

export interface LootlogGameClientApi {
  readonly apiVersion: 1;
  readonly ready: boolean;
  getGuilds(): PublicGuild[] | undefined;
  getTimers(options?: { world?: string }): PublicTimer[] | undefined;
  getOnlinePlayers(options: {
    guildId: string;
    world: string;
  }): Promise<PublicOnlinePlayersResult>;
  getSocketState(): PublicSocketState;
  subscribe<E extends ApiEventName>(
    eventName: E,
    listener: (payload: ApiEventMap[E]) => void,
  ): () => void;
}
