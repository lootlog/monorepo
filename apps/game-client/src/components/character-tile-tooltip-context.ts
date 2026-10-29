import type { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { MargonemCharacter } from "@/api/characters.api";
import { createContext } from "react";

export type CharacterTileCharacter = Pick<
  MargonemCharacter,
  "icon" | "nick" | "lvl" | "prof"
>;

/** A list's shared character tooltip; without one, each tile mounts its own. */
export const CharacterTileTooltipContext =
  createContext<BaseTooltip.Handle<CharacterTileCharacter> | null>(null);
