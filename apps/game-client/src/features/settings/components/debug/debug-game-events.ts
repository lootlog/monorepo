import type { GameEvent } from "@lootlog/margonem/game-events";

// Debug GameEvent builders shared by the settings debug tab and the standalone sandbox.

export const createBaseEvent = (): Pick<GameEvent, "d" | "e" | "ev"> => ({
  d: ["", "", ""],
  e: "ok",
  ev: Date.now(),
});

export const createUniqueKillNpcEvent = (): GameEvent => {
  const uniqueId = Date.now();
  const npcId = -Math.floor(Math.random() * 100000);

  return {
    ...createBaseEvent(),
    f: {
      init: "1",
      endBattle: 1,
      m: [`unique_battle_${uniqueId}`],
      w: {
        [String(npcId)]: {
          id: npcId,
          originalId: Math.abs(npcId),
          name: `Debug Boss #${uniqueId}`,
          lvl: 100,
          prof: "b",
          icon: "e2/worundriel02.gif",
          wt: 85,
          type: 2,
          hpp: 0,
          team: 1,
        },
        "99999": {
          id: 99999,
          originalId: 99999,
          name: "Player",
          lvl: 150,
          prof: "w",
          icon: "/eve/kup23-elf-k.gif",
          wt: 0,
          type: 0,
          hpp: 100,
          team: 0,
        },
      },
    },
  };
};

export type DetectorNpcConfig = {
  npcId: number;
  name: string;
  wt: number;
  icon: string;
  lvl: number;
  prof: string;
};

export const DETECTOR_NPC_PRESETS = {
  titan: {
    npcId: 123,
    name: "Debug Tytan",
    wt: 102,
    icon: "tyt/maddok-tytan2.gif",
    lvl: 231,
    prof: "h",
  },
  hero: {
    npcId: 124,
    name: "Debug Heros",
    wt: 85,
    icon: "e2/worundriel02.gif",
    lvl: 180,
    prof: "b",
  },
  colossus: {
    npcId: 125,
    name: "Debug Kolos",
    wt: 95,
    icon: "her/viv_nandin_i3bd1.gif",
    lvl: 200,
    prof: "m",
  },
  elite2: {
    npcId: 126,
    name: "Debug Elite II",
    wt: 25,
    icon: "her/viv_nandin_i3bd1.gif",
    lvl: 120,
    prof: "w",
  },
} satisfies Record<string, DetectorNpcConfig>;

export const createDetectorEvent = (preset: DetectorNpcConfig): GameEvent => {
  const uniqueId = Date.now();
  const npcId = preset.npcId;
  const tplId = Math.floor(Math.random() * 10000) + 90000;
  const iconId = Math.floor(Math.random() * 10000) + 90000;

  return {
    ...createBaseEvent(),
    npcs: [
      {
        id: npcId,
        icon: { id: iconId },
        tpl: tplId,
        x: Math.floor(Math.random() * 20) + 5,
        y: Math.floor(Math.random() * 20) + 5,
      },
    ],
    npc_tpls: [
      {
        id: tplId,
        level: preset.lvl,
        nick: `${preset.name} #${uniqueId % 1000}`,
        prof: preset.prof,
        type: 2,
        warrior_type: preset.wt,
        resp_rand: 0,
        elasticLevelFactor: 0,
      },
    ],
    icons: [
      {
        id: iconId,
        icon: preset.icon,
      },
    ],
  };
};

export const createPartyJoinEvent = (): GameEvent => ({
  ...createBaseEvent(),
  party: {
    members: {
      "617": {
        id: 617,
        nick: "cashtelan",
        icon: "/kuf/her_xxxiii_nymph_cold_k2.gif",
        commander: 1,
        account: 9822301,
      },
      "12345": {
        id: 12345,
        nick: "Debug Player",
        icon: "/eve/kup23-elf-k.gif",
        account: 1234567,
      },
    },
  },
});

export const createPartyLeaveEvent = (): GameEvent => ({
  ...createBaseEvent(),
  party: {
    members: {},
  },
});

export const DEBUG_EVENT_TEMPLATES = {
  npcSpawn: {
    event: {
      ...createBaseEvent(),
      npcs: [
        {
          id: 999999,
          icon: { id: 1 },
          tpl: 1,
          x: 10,
          y: 10,
        },
      ],
    },
  },
  npcDelete: {
    event: {
      ...createBaseEvent(),
      npcs_del: [{ id: 999999 }],
    },
  },
  killNpc: {
    event: {
      ...createBaseEvent(),
      f: {
        init: "1",
        endBattle: 1,
        w: {
          "-12341": {
            id: -12341,
            originalId: 12341,
            name: "Debug Bossx",
            lvl: 100,
            prof: "b",
            icon: "e2/worundriel02.gif",
            wt: 85,
            type: 2,
            hpp: 0,
            team: 1,
          },
          "99999": {
            id: 99999,
            originalId: 99999,
            name: "Player",
            lvl: 150,
            prof: "w",
            icon: "/eve/kup23-elf-k.gif",
            wt: 0,
            type: 0,
            hpp: 100,
            team: 0,
          },
        },
      },
    },
  },
  townChange: {
    event: {
      ...createBaseEvent(),
      town: {
        id: 123,
        name: "Debug Map",
        mainid: 1,
        bg: "0",
        file: "map.png",
        mode: 1,
        pvp: 0,
        visibility: 1,
        water: "0",
        x: 10,
        y: 10,
      },
    },
  },
  afkOn: {
    event: {
      ...createBaseEvent(),
      h: { stasis: 1 },
    },
  },
  afkOff: {
    event: {
      ...createBaseEvent(),
      h: { stasis: 0 },
    },
  },
  lootFight: {
    event: {
      ...createBaseEvent(),
      loot: {
        source: "fight",
        states: { "123456": 1 },
      },
    },
  },
  lootDialog: {
    event: {
      ...createBaseEvent(),
      loot: {
        source: "dialog",
        states: { "123456": 1 },
      },
    },
  },
} satisfies Record<string, { event: GameEvent }>;
