import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { useState, type ReactNode } from "react";
import { CharacterTileTooltipContent } from "./character-tile-tooltip-content";
import {
  CharacterTileTooltipContext,
  type CharacterTileCharacter,
} from "./character-tile-tooltip-context";

type SharedCharacterTileTooltipProps = {
  children: ReactNode;
};

/**
 * One tooltip for every CharacterTile of a list, so a long list does not
 * mount a tooltip root per tile.
 */
export const SharedCharacterTileTooltip = ({
  children,
}: SharedCharacterTileTooltipProps) => {
  const [handle] = useState(() =>
    BaseTooltip.createHandle<CharacterTileCharacter>(),
  );

  return (
    <CharacterTileTooltipContext.Provider value={handle}>
      {children}

      <Tooltip handle={handle}>
        {({ payload }) =>
          payload ? (
            <TooltipContent>
              <CharacterTileTooltipContent character={payload} />
            </TooltipContent>
          ) : null
        }
      </Tooltip>
    </CharacterTileTooltipContext.Provider>
  );
};
