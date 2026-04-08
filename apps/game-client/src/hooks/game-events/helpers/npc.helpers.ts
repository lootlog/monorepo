import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import { Game } from "@/lib/game";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import type { NpcTpl, GameNpc } from "@lootlog/margonem";

export const composeNpcFromEvent = (
  npc: EventNpc,
  tpl: NpcTpl,
  processedSettings: ProcessedNpcSettings,
): GameNpcWithLocation => ({
  ...npc,
  icon: processedSettings.icon,
  nick: tpl.nick,
  prof: tpl.prof,
  wt: tpl.wt,
  lvl: tpl.lvl,
  type: tpl.type,
  location: Game.map.name,
  notificationSent: processedSettings.autoSendNotification,
});

export const composeNpcFromGame = (
  npc: GameNpc,
  processedSettings: ProcessedNpcSettings,
): GameNpcWithLocation => ({
  ...npc,
  icon: processedSettings.icon,
  location: Game.map.name,
  notificationSent: processedSettings.autoSendNotification,
});
