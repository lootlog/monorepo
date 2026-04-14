import type { ChatCharacterData } from "@/hooks/api/use-send-chat-message";
import { Game } from "@/lib/game";

export const getHeroCharacterData = (): ChatCharacterData => ({
  nick: Game.hero.nick,
  id: Game.hero.id,
  acc: Game.hero.account,
  lvl: Game.hero.lvl,
  prof: Game.hero.prof,
  icon: Game.hero.img,
});
