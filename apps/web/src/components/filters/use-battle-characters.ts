import { useBattlesControllerGetUserCharacters } from "@lootlog/client/battlelog";

const NO_CHARACTERS: never[] = [];

export const useBattleCharacters = () =>
  useBattlesControllerGetUserCharacters().data?.characters ?? NO_CHARACTERS;
