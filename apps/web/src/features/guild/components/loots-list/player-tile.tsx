import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  MARGONEM_CDN_CHARACTERS_URL,
  MARGONEM_PROFILE_URL,
} from "@/constants/margonem";
import { cn } from "@lootlog/ui/lib/utils";

import type { FC } from "react";
import type { Player } from "@/hooks/api/game-data/use-guild-players";

type PlayerTileProps = {
  player: Partial<Player>;
  idx?: number;
  color?: string;
  className?: string;
  accountId?: number;
  characterId?: number;
  world?: string;
};

export const PlayerTile: FC<PlayerTileProps> = ({
  player: { lvl, prof, name, icon },
  idx,
  color,
  className = "",
  accountId,
  characterId,
  world,
}) => {
  const content = (
    <div className={cn("relative scale-90 origin-top", className)}>
      <div
        className={cn(
          // Simplified transition - only bg color, not all properties
          "w-[32px] h-[48px] relative cursor-pointer rounded-lg bg-muted/30 transition-colors duration-200 hover:bg-muted/50",
        )}
        style={{
          backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
          backgroundColor: "transparent",
        }}
      />
      {idx !== undefined && (
        <div
          className="top-10 -right-1 absolute size-4 rounded-sm box-content text-xs flex items-center justify-center font-medium shadow-sm"
          style={{
            backgroundColor: color ? `${color}` : "var(--background)",
          }}
        >
          {idx + 1}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        {accountId && characterId && world ? (
          <a
            href={`${MARGONEM_PROFILE_URL},${accountId}#char_${characterId},${world}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </a>
        ) : (
          content
        )}
      </TooltipTrigger>
      <TooltipContent className="bg-popover/95 backdrop-blur-md border-border/50">
        <p className="text-foreground font-semibold">
          {name}{" "}
          <span className="text-muted-foreground font-normal">
            ({lvl}
            {prof?.charAt(0).toLowerCase()})
          </span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
