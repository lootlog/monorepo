import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { cn } from "@lootlog/ui/lib/utils";

import type { FC } from "react";
import type { Player } from "@/hooks/api/game-data/use-guild-players";

type PlayerTileProps = {
  player: Partial<Player>;
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
          <div className={cn("relative", className)}>
            <div
              className={cn(
                "w-[32px] h-[48px] relative cursor-pointer rounded-lg",
              )}
              style={{
                backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
                backgroundColor: "transparent",
              }}
            />
            {idx !== undefined && (
              <div
                className="top-10 -right-1 absolute size-4 rounded-sm box-content bg-background text-xs flex items-center justify-center"
                style={{
                  backgroundColor: color ? `${color}` : "transparent",
                }}
              >
                {idx + 1}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {name} &nbsp;({lvl}
            {prof?.charAt(0).toLowerCase()})
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
