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
import { useSharedTooltip } from "@/components/shared-tooltip/shared-tooltip-provider";

import type { FC } from "react";

type PlayerTilePlayer = {
  id?: string | number;
  name?: string;
  lvl?: number | null;
  prof?: string | null;
  icon?: string | null;
};

type PlayerTileProps = {
  player: PlayerTilePlayer;
  idx?: number;
  color?: string;
  className?: string;
  accountId?: number;
  characterId?: number;
  world?: string;
};

const PlayerTooltipContent: FC<{
  name?: string;
  lvl?: number;
  prof?: string;
}> = ({ name, lvl, prof }) => (
  <p className="text-foreground font-semibold">
    {name}{" "}
    <span className="text-muted-foreground font-normal">
      ({lvl}
      {prof?.charAt(0).toLowerCase()})
    </span>
  </p>
);

export const PlayerTile: FC<PlayerTileProps> = ({
  player: { lvl, prof, name, icon },
  idx,
  color,
  className = "",
  accountId,
  characterId,
  world,
}) => {
  const sharedTooltip = useSharedTooltip();

  const tileContent = (
    <div className={cn("relative scale-90 origin-top", className)}>
      <div
        className={cn(
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

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    sharedTooltip?.showTooltip(
      <PlayerTooltipContent
        name={name}
        lvl={lvl ?? undefined}
        prof={prof ?? undefined}
      />,
      e.currentTarget.getBoundingClientRect(),
      {
        contentClassName: "bg-popover/95 backdrop-blur-md border-border/50",
        triggerElement: e.currentTarget,
      },
    );
  };

  const handleMouseLeave = () => {
    sharedTooltip?.hideTooltip();
  };

  if (sharedTooltip) {
    const wrapper =
      accountId && characterId && world ? (
        <a
          href={`${MARGONEM_PROFILE_URL},${accountId}#char_${characterId},${world}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {tileContent}
        </a>
      ) : (
        <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {tileContent}
        </span>
      );

    return wrapper;
  }

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
            {tileContent}
          </a>
        ) : (
          tileContent
        )}
      </TooltipTrigger>
      <TooltipContent className="bg-popover/95 backdrop-blur-md border-border/50">
        <PlayerTooltipContent
          name={name}
          lvl={lvl ?? undefined}
          prof={prof ?? undefined}
        />
      </TooltipContent>
    </Tooltip>
  );
};
