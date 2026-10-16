import { upperFirst } from "es-toolkit";
import type { BattleCharacter } from "@/lib/api/battlelog-types";

// The level and profession come from the character's latest battle, so a
// character without battles only has its world.
export const getCharacterDetails = (character: BattleCharacter) => {
  const world = upperFirst(character.world);

  // A battlelog deployed before these fields existed omits them entirely.
  const level = character.lvl ?? null;
  const profession = character.prof ?? null;

  return level === null || profession === null
    ? world
    : `${world} · ${level}${profession}`;
};
