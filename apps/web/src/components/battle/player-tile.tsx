import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { FC } from "react";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";

type PlayerTileProps = {
  player: {
    id?: string;
    lvl?: number;
    prof?: string;
    name?: string;
    icon?: string;
  };
  idx?: number;
  color?: string;
  className?: string;
  cdnBaseUrl?: string;
};

export const PlayerTile: FC<PlayerTileProps> = ({
  player: { id, lvl, prof, name, icon },
  idx,
  color,
  className = "",
  cdnBaseUrl = MARGONEM_CDN_CHARACTERS_URL,
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
            cdnBaseUrl={cdnBaseUrl}
            wrapperClassName="relative ring-0 outline-none"
            tileClassName="bg-transparent transition-none hover:bg-transparent"
            defaultBadgeColor="transparent"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {name}
            {lvl && `(${lvl}${prof?.charAt(0).toLowerCase()})`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
