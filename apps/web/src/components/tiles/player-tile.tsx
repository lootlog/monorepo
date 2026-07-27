import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

import type { FC } from "react";
import type { PlayerHitDtoOutput } from "@lootlog/api-client/models/search/player-hit-dto-output";
import { PlayerSpriteTile } from "./player-sprite-tile";

type PlayerTileProps = {
  player: Partial<PlayerHitDtoOutput>;
  idx?: number;
  color?: string;
  className?: string;
};

export const PlayerTile: FC<PlayerTileProps> = ({
  player: { id, lvl, prof, name, icon },
  idx,
  color,
  className = "",
}) => {
  return (
    <TooltipProvider key={id}>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <PlayerSpriteTile
            icon={icon}
            idx={idx}
            color={color}
            className={className}
            tileClassName="transition-all"
          />
        </TooltipTrigger>
        <TooltipContent className="bg-popover/95  border-border/50">
          <p className="text-foreground">
            {name}{" "}
            <span className="text-muted-foreground">
              ({lvl}
              {prof?.charAt(0).toLowerCase()})
            </span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
