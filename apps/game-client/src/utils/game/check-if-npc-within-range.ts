import { Hero } from "@/types/margonem/hero";

export const checkIfNpcIsWithinRange = (npc: Hero["d"], newInterface: boolean) => {
  const mapVisibility = newInterface ? window.Engine.map.d.visibility : window.map.visibility;

  if (mapVisibility === 0) return true;

  const { x, y } = npc;
  const { x: heroX, y: heroY } = newInterface ? window.Engine.hero.d : window.hero;

  const distance = Math.sqrt((x - heroX) ** 2 + (y - heroY) ** 2);

  return distance <= mapVisibility;
};
