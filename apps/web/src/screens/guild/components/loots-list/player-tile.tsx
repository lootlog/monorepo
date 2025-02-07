import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "components/ui/tooltip";
import { MARGONEM_CDN_CHARACTERS_URL } from "constants/margonem";
import { Player } from "hooks/api/use-guild-players";

import { FC } from "react";

type PlayerTileProps = {
  player: Player;
};

export const PlayerTile: FC<PlayerTileProps> = ({
  player: { id, lvl, prof, name, icon },
}) => {
  return (
    <TooltipProvider key={id}>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div
            className={"w-[32px] h-[48px] relative cursor-pointer rounded-lg"}
            style={{
              backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
            }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {name} &nbsp;({lvl}
            {prof.charAt(0).toLowerCase()})
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
