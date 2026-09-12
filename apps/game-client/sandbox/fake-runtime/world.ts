import type { GameHero, WarriorStats } from "@lootlog/margonem/hero";
import type { GameMap } from "@lootlog/margonem/map";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { GameOther } from "@lootlog/margonem/others";
import type { NpcTpl } from "@lootlog/margonem/game-events";
import {
  SANDBOX_ACCOUNT_ID,
  SANDBOX_CHARACTERS,
  SANDBOX_CLAN,
} from "./character-list";

export type SandboxInterface = "ni" | "si";

type SandboxHero = Pick<
  GameHero,
  "account" | "clan" | "id" | "img" | "lvl" | "nick" | "prof" | "x" | "y"
> & {
  stasis: number;
  warrior_stats: Pick<WarriorStats, "hp" | "maxhp">;
};

type SandboxPartyMember = {
  id: number;
  nick: string;
  icon: string;
  leader: boolean;
  hp: [number, number];
  profession: string | null;
  accountId: number;
};

// Mutable Margonem-like state. Objects are mutated in place because the game
// hands out long-lived references (window.hero, Engine.hero.d, g.npc).
export type SandboxWorld = {
  world: string;
  hero: SandboxHero;
  map: GameMap;
  npcs: Record<string, GameNpc>;
  others: Record<string, GameOther>;
  party: Map<number, SandboxPartyMember>;
  npcTemplates: Map<number, NpcTpl>;
  npcIcons: Map<number, string>;
};

const seedNpcs: GameNpc[] = [
  {
    id: 300001,
    tpl: 1,
    nick: "Kocha Tygrysica",
    prof: "w",
    icon: "e2/kocha.gif",
    lvl: 48,
    type: 2,
    wt: 20,
    x: 14,
    y: 9,
  },
  {
    id: 300002,
    tpl: 2,
    nick: "Mushita",
    prof: "m",
    icon: "e2/mushita.gif",
    lvl: 23,
    type: 2,
    wt: 20,
    x: 30,
    y: 22,
  },
  {
    id: 300003,
    tpl: 3,
    nick: "Szczur",
    prof: "w",
    icon: "zwi/szczur.gif",
    lvl: 5,
    type: 2,
    wt: 0,
    x: 8,
    y: 18,
  },
];

const seedOthers: GameOther[] = [
  {
    id: "800001",
    account: 910001,
    nick: "Aurelia",
    icon: "/kuf/her_xxxiii_nymph_cold_k2.gif",
    lvl: 231,
    prof: "m",
    x: 12,
    y: 10,
  },
  {
    id: "800002",
    account: 910002,
    nick: "Borgin",
    icon: "/eve/kup23-elf-k.gif",
    lvl: 198,
    prof: "w",
    x: 16,
    y: 11,
  },
];

export function createSandboxWorld(): SandboxWorld {
  const [sandboxHero] = SANDBOX_CHARACTERS;

  return {
    world: sandboxHero.world,
    hero: {
      account: SANDBOX_ACCOUNT_ID,
      id: sandboxHero.id,
      img: sandboxHero.icon,
      lvl: sandboxHero.lvl,
      nick: sandboxHero.nick,
      prof: sandboxHero.prof,
      x: 13,
      y: 10,
      clan: { ...SANDBOX_CLAN },
      stasis: 0,
      warrior_stats: { hp: 48_000, maxhp: 52_000 },
    },
    map: { id: 1, name: "Ithan", visibility: 0 },
    npcs: Object.fromEntries(seedNpcs.map((npc) => [String(npc.id), npc])),
    others: Object.fromEntries(seedOthers.map((other) => [other.id, other])),
    party: new Map(),
    npcTemplates: new Map(),
    npcIcons: new Map(),
  };
}
