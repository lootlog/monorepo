import { upperFirst } from "es-toolkit";

/** A character a selector offers, from whichever service knows it. */
export type SelectableCharacter = {
  readonly id: string;
  readonly name: string;
  readonly world: string;
  readonly icon?: string | null;
  readonly lvl?: number | null;
  readonly prof?: string | null;
};

// The level and profession come from the source's latest record of the
// character, so a character without one only has its world.
export const getCharacterDetails = (character: SelectableCharacter) => {
  const world = upperFirst(character.world);
  const level = character.lvl ?? null;
  const profession = character.prof ?? null;

  return level === null || profession === null
    ? world
    : `${world} · ${level}${profession}`;
};
