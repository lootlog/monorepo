import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";
import type { GameNpc } from "@lootlog/margonem/npcs";

export const composeNpcFromEvent = (
  npc: EventNpc,
  tpl: NpcTpl,
  processedSettings: ProcessedNpcSettings,
  location: string,
): GameNpcWithLocation => ({
  ...npc,
  icon: processedSettings.icon,
  nick: tpl.nick,
  prof: tpl.prof,
  wt: tpl.wt,
  lvl: tpl.lvl,
  type: tpl.type,
  location,
  notificationSent: false,
});

export const composeNpcFromGame = (
  npc: GameNpc,
  processedSettings: ProcessedNpcSettings,
  location: string,
): GameNpcWithLocation => ({
  ...npc,
  icon: processedSettings.icon,
  location,
  notificationSent: false,
});
