import { Game } from "@/lib/game";
import { Hero } from "@/types/margonem/hero";

export const checkIfNpcIsWithinRange = (npc: Hero["d"]) => {
  const mapVisibility = Game.map.visibility;

  if (mapVisibility === 0) return true;

  const { x, y } = npc;
  const { x: heroX, y: heroY } = Game.hero;

  const distance = Math.sqrt((x - heroX) ** 2 + (y - heroY) ** 2);

  return distance <= mapVisibility;
};
