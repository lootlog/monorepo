import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  MARGONEM_CDN_CHARACTERS_URL,
  MARGONEM_PROFILE_URL,
} from "@/constants/margonem";
import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";

import type { FC } from "react";
import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";

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
    <PlayerSpriteTile
      icon={icon}
      idx={idx}
      color={color}
      className={className}
      cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
    />
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
