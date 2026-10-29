import type { FC } from "react";
import type { CharacterTileCharacter } from "./character-tile-tooltip-context";

type CharacterTileTooltipContentProps = {
  character: CharacterTileCharacter;
};

export const CharacterTileTooltipContent: FC<
  CharacterTileTooltipContentProps
> = ({ character }) => (
  <span className="ll:font-semibold">
    {character.nick} ({character.lvl}
    {character.prof})
  </span>
);
