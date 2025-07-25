import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { Player } from "@/hooks/api/use-guild-players";
import { cn } from "@lootlog/ui/lib/utils";

import { FC } from "react";

type PlayerTileProps = {
  player: Player;
  idx: number;
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
          <div className={cn("relative", className)}>
            <div
              className={cn(
                "w-[32px] h-[48px] relative cursor-pointer rounded-lg"
                // className
              )}
              style={{
                backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
                backgroundColor: "transparent",
              }}
            />
            <div
              className="top-10 -right-1 absolute size-4 rounded-sm box-content bg-background text-xs flex items-center justify-center"
              style={{
                backgroundColor: color ? `${color}` : "transparent",
              }}
            >
              {idx + 1}
            </div>
          </div>
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
