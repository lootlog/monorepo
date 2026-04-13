import type { NpcTypeEnum as NpcType } from "@lootlog/types";

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

export type ApiEventMap = {
  ready: void;
  "guilds:changed": PublicGuild[] | undefined;
  "timers:changed": {
    world: string;
    guildId: string;
    timers: PublicTimer[];
  };
  "socket:state-changed": PublicSocketState;
};

export type ApiEventName = keyof ApiEventMap;

export interface LootlogGameClientApi {
  readonly apiVersion: 1;
  readonly ready: boolean;
  getGuilds(): PublicGuild[] | undefined;
  getTimers(options?: { world?: string }): PublicTimer[] | undefined;
  getSocketState(): PublicSocketState;
  subscribe<E extends ApiEventName>(
    eventName: E,
    listener: (payload: ApiEventMap[E]) => void,
  ): () => void;
}
