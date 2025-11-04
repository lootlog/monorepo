import type { GameEvent } from "@/types/margonem/game-events/game-event";

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: "battle" | "npc" | "loot" | "chat" | "dialog";
  event: GameEvent;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "battle-init",
    name: "Battle Init",
    description: "Start a new battle with two warriors",
    category: "battle",
    event: {
      d: {} as any,
      e: "ok",
      ev: 1,
      f: {
        init: "1",
        w: {
          "1": {
            id: 1,
            nick: "Player",
            lvl: 100,
            team: 1,
            maxhp: 5000,
            hp: 5000,
            prof: 1,
          },
          "2": {
            id: 2,
            nick: "Boss NPC",
            lvl: 150,
            team: 2,
            maxhp: 10000,
            hp: 10000,
            prof: 2,
          },
        },
      },
    },
  },
  {
    id: "battle-end",
    name: "Battle End",
    description: "End current battle with victory",
    category: "battle",
    event: {
      d: {} as any,
      e: "ok",
      ev: 1,
      f: {
        endBattle: 1,
        m: ["Player attacks Boss NPC", "Boss NPC attacks Player", "Victory!"],
      },
    },
  },
  {
    id: "npc-spawn-hero",
    name: "NPC Spawn (Hero)",
    description: "Spawn a Hero-tier NPC",
    category: "npc",
    event: {
      d: {} as any,
      e: "ok",
      ev: 1,
      npcs: [
        {
          id: 99999,
          x: 50,
          y: 50,
          tpl: 888,
          icon: { id: 1, type: 1 },
          hpp: 100,
        },
      ],
      npc_tpls: [
        {
          id: 888,
          nick: "Test Hero",
          lvl: 275,
          wt: 4,
          prof: 1,
          type: 0,
          resp_rand: 300,
        },
      ],
    },
  },
  {
    id: "npc-despawn",
    name: "NPC Despawn",
    description: "Despawn NPC and create respawn timer",
    category: "npc",
    event: {
      d: {} as any,
      e: "ok",
      ev: 1,
      npcs_del: [
        {
          id: 99999,
          respBaseSeconds: 3600,
        },
      ],
    },
  },
  {
    id: "loot-drop",
    name: "Loot Drop",
    description: "Drop loot from battle",
    category: "loot",
    event: {
      d: {} as any,
      e: "ok",
      ev: 1,
      item: {
        id: 12345,
        name: "Epic Sword",
        stat: "attack+50",
      } as any,
      loot: {
        source: "fight",
      } as any,
    },
  },
  {
    id: "chat-system",
    name: "System Chat Message",
    description: "System message in chat",
    category: "chat",
    event: {
      d: {} as any,
      e: "ok",
      ev: 1,
      chat: {
        channels: {
          system: {
            msg: ["Test system message"],
          },
        },
      },
    },
  },
  {
    id: "dialog-open",
    name: "Dialog Open",
    description: "Open dialog with NPC",
    category: "dialog",
    event: {
      d: [null, null, "12345"] as any,
      e: "ok",
      ev: 1,
    },
  },
];

export const getTemplatesByCategory = (category: EventTemplate["category"]) => {
  return EVENT_TEMPLATES.filter((t) => t.category === category);
};

export const getTemplateById = (id: string) => {
  return EVENT_TEMPLATES.find((t) => t.id === id);
};
