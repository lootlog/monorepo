import type { GameEvent } from "@/types/margonem/game-events/game-event";
import type { W } from "@/types/margonem/game-events/f";
import { gameEventsStore } from "@/store/game-store/game-events.store";
import { battleStore } from "@/store/game-store/battle.store";

export const createMockBattleInitEvent = (warriors?: W): GameEvent => ({
  d: {} as any,
  e: "ok",
  ev: 1,
  f: {
    init: "1",
    w: warriors || {
      "1": {
        id: 1,
        nick: "Test Player",
        lvl: 100,
        prof: 1,
        team: 1,
        maxhp: 5000,
        hp: 5000,
      },
      "2": {
        id: 2,
        nick: "Test Boss",
        lvl: 150,
        prof: 2,
        team: 2,
        maxhp: 10000,
        hp: 10000,
      },
    },
  },
});

export const createMockBattleEndEvent = (): GameEvent => ({
  d: {} as any,
  e: "ok",
  ev: 1,
  f: {
    endBattle: 1,
    m: ["Battle log message 1", "Battle log message 2", "Victory!"],
  },
  item: {
    id: 12345,
    name: "Epic Sword",
    stat: "attack+50",
  } as any,
  loot: {
    source: "fight",
  } as any,
});

export const createMockNpcSpawnEvent = (overrides?: {
  npcId?: number;
  tplId?: number;
  npcName?: string;
  npcLvl?: number;
  npcWt?: number;
}): GameEvent => ({
  d: {} as any,
  e: "ok",
  ev: 1,
  npcs: [
    {
      id: overrides?.npcId ?? 12345,
      x: 100,
      y: 200,
      tpl: overrides?.tplId ?? 999,
      icon: { id: 1, type: 1 },
      hpp: 100,
    },
  ],
  npc_tpls: [
    {
      id: overrides?.tplId ?? 999,
      nick: overrides?.npcName ?? "Boss NPC",
      lvl: overrides?.npcLvl ?? 150,
      wt: overrides?.npcWt ?? 4,
      prof: 1,
      type: 0,
      resp_rand: 300,
    },
  ],
});

export const createMockNpcDespawnEvent = (
  npcId: number,
  respBaseSeconds = 3600,
): GameEvent => ({
  d: {} as any,
  e: "ok",
  ev: 1,
  npcs_del: [
    {
      id: npcId,
      respBaseSeconds,
    },
  ],
});

export const createMockLootEvent = (): GameEvent => ({
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
});

export const createMockChatEvent = (message: string): GameEvent => ({
  d: {} as any,
  e: "ok",
  ev: 1,
  chat: {
    channels: {
      system: {
        msg: [message],
      },
    },
  },
});

export const createMockDialogEvent = (npcId: string): GameEvent => ({
  d: [null, null, npcId] as any,
  e: "ok",
  ev: 1,
});

export const createMockPartyEvent = (): GameEvent => ({
  d: {} as any,
  e: "ok",
  ev: 1,
  party: {
    action: "invite",
    from: "TestPlayer",
  } as any,
});

export const resetGameEventsStore = () => {
  gameEventsStore.reset();
};

export const resetBattleStore = () => {
  battleStore.events = [];
  battleStore.battleState = "idle";
  battleStore.lastBattleHash = "";
};

export const resetAllStores = () => {
  resetGameEventsStore();
  resetBattleStore();
};
