import { upperFirst } from "es-toolkit";

export type SelectableCharacter = {
  readonly id: string;
  readonly name: string;
  readonly world: string;
  readonly icon?: string | null;
  readonly lvl?: number | null;
  readonly prof?: string | null;
};

export const getCharacterDetails = (character: SelectableCharacter) => {
  const world = upperFirst(character.world);
  const level = character.lvl ?? null;
  const profession = character.prof ?? null;

  return level === null || profession === null
    ? world
    : `${world} · ${level}${profession}`;
};
