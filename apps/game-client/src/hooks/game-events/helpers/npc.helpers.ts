import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";

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
