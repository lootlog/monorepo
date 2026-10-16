import { useBattlesControllerGetUserCharacters } from "@lootlog/client/battlelog";

const NO_CHARACTERS: never[] = [];

/** The User's characters seen in recorded battles, for a `CharacterSelector`. */
export const useBattleCharacters = () =>
  useBattlesControllerGetUserCharacters().data?.characters ?? NO_CHARACTERS;
