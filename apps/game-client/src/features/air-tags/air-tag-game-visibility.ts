import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";

/**
 * Whether Margonem already draws this player: the hero, or a player the game
 * received, which it sends only inside the hero's war shadow range. AirTags
 * show the rest, so they never cover the game's own characters.
 */
export const isShownByGame = (targetId: string): boolean =>
  targetId === useGameStore.getState().game?.hero.characterId ||
  useOthersStore.getState().othersById[targetId] !== undefined;
