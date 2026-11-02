import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";

export const composeNpcFromEvent = (
  { killSeconds: _killSeconds, ...npc }: NonNullable<GameEvent["npcs"]>[number],
  tpl: Omit<NpcTpl, "id">,
  icon: string,
  location: string,
): GameNpcWithLocation => ({
  ...npc,
  icon,
  nick: tpl.nick,
  prof: tpl.prof,
  wt: tpl.wt,
  lvl: tpl.lvl,
  type: tpl.type,
  isHeroFromEvent: tpl.isHeroFromEvent,
  location,
  notificationSentAt: null,
});
