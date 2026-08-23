import type { GameEvent } from "@lootlog/margonem/game-events";

export type RuntimeStatus = "uninitialized" | "ready";
export type RuntimeInterface = "ni" | "si";

export type RuntimeNpc = Readonly<{
  actions?: number;
  groupId?: number;
  icon: string;
  id: number;
  level: number;
  name: string;
  profession: string;
  respawnRandomness?: number;
  templateId: number;
  type: number;
  weight: number;
  x: number;
  y: number;
}>;

export type RuntimeMap = Readonly<{
  id: number;
  name: string;
  visibility: number;
}>;

export type RuntimeHero = Readonly<{
  accountId: string;
  characterId: string;
  clan?: Readonly<{
    id: number;
    name: string;
    rank: number;
  }>;
  currentHp: number;
  icon: string;
  level: number;
  maxHp: number;
  name: string;
  profession: string;
  x: number;
  y: number;
}>;

export type RuntimeGameSnapshot = Readonly<{
  hero: RuntimeHero;
  interface: RuntimeInterface;
  map: RuntimeMap;
  world: string;
}>;

export type RuntimeOther = Readonly<{
  accountId: string;
  characterId: string;
  icon: string;
  level: number;
  name: string;
  profession: string;
}>;

export type RuntimePartyMember = Readonly<{
  accountId: string;
  characterId: string;
  currentHp: number;
  icon: string;
  isLeader: boolean;
  maxHp: number;
  name: string;
  profession: string | null;
}>;

export type RuntimeFriend = Readonly<{
  characterId: string;
  icon: string;
  level: number;
  location: string;
  name: string;
  profession: string;
  status: string;
}>;

export type RuntimeStateSnapshot = Readonly<{
  friends: readonly RuntimeFriend[];
  game: RuntimeGameSnapshot;
  npcs: readonly RuntimeNpc[];
  others: Readonly<Record<string, RuntimeOther>>;
  party: readonly RuntimePartyMember[];
}>;

export type RuntimeIntent = Readonly<{
  npc: RuntimeNpc | null;
  npcId: number;
  type: "talk";
}>;

export type RuntimeFact = Readonly<{
  kind:
    | "afk"
    | "battle"
    | "chat"
    | "dialog"
    | "friends"
    | "loot"
    | "map"
    | "npc-delete"
    | "npc-upsert"
    | "other"
    | "party";
  event: GameEvent;
}>;

export type RuntimeIngressSnapshot = Readonly<{
  game: RuntimeGameSnapshot | null;
  intent: RuntimeIntent | null;
  npcsById: Readonly<Record<number, RuntimeNpc>>;
  othersById: Readonly<Record<string, RuntimeOther>>;
}>;

export type RuntimeEventEnvelope = Readonly<{
  facts: readonly RuntimeFact[];
  ingress: RuntimeIngressSnapshot;
  observedAt: number;
  raw?: GameEvent;
  sequence: number;
}>;

export type RuntimeEventHandler = (envelope: RuntimeEventEnvelope) => void;
export type RuntimeIntentHandler = (intent: RuntimeIntent) => void;

export type RuntimeObserverFailure = Readonly<{
  error: unknown;
  phase: "applied" | "initialization" | "intent";
  sequence: number;
}>;
