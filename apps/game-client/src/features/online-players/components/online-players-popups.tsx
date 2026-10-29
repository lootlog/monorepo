import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { SharedContextMenu } from "@/components/common/shared-context-menu";
import { SharedCharacterTileTooltip } from "@/components/shared-character-tile-tooltip";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { useState, type ReactElement } from "react";
import { OnlinePlayerTooltip } from "./online-player-tooltip";
import {
  OnlinePlayerTooltipContext,
  type OnlinePlayerTooltipPayload,
} from "./online-players-popups-context";

type OnlinePlayersPopupsProps = {
  /** The player list; it becomes the trigger of the shared context menu. */
  children: ReactElement;
};

/**
 * One context menu and one tooltip of each kind for every row of the list,
 * which renders every online player at once.
 */
export const OnlinePlayersPopups = ({ children }: OnlinePlayersPopupsProps) => {
  const [playerTooltip] = useState(() =>
    BaseTooltip.createHandle<OnlinePlayerTooltipPayload>(),
  );

  return (
    <OnlinePlayerTooltipContext.Provider value={playerTooltip}>
      <SharedCharacterTileTooltip>
        <SharedContextMenu>{children}</SharedContextMenu>
      </SharedCharacterTileTooltip>

      <Tooltip handle={playerTooltip}>
        {({ payload }) =>
          payload ? (
            <TooltipContent className="ll:max-w-64">
              <OnlinePlayerTooltip {...payload} />
            </TooltipContent>
          ) : null
        }
      </Tooltip>
    </OnlinePlayerTooltipContext.Provider>
  );
};
