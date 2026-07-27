import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  MARGONEM_CDN_CHARACTERS_URL,
  getMargonemProfileUrl,
} from "@/constants/margonem";
import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";

import type { FC } from "react";
import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { ExternalLink, ListFilter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";

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
  onShowLoots?: () => void;
  highlighted?: boolean;
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
  onShowLoots,
  highlighted = false,
}) => {
  const sharedTooltip = useSharedTooltip();
  const { t } = useTranslation();
  const profileUrl = getMargonemProfileUrl({
    accountId,
    characterId,
    world,
  });

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
        contentClassName: "bg-popover/95  border-border/50",
        triggerElement: e.currentTarget,
      },
    );
  };

  const handleMouseLeave = () => {
    sharedTooltip?.hideTooltip();
  };

  let triggerElement = (
    <span
      className={onShowLoots ? "cursor-context-menu" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {tileContent}
    </span>
  );
  if (profileUrl && !onShowLoots) {
    triggerElement = (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {tileContent}
      </a>
    );
  }

  let playerTrigger = triggerElement;
  if (!sharedTooltip) {
    playerTrigger = (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{triggerElement}</TooltipTrigger>
        <TooltipContent className="border-border/50 bg-popover/95">
          <PlayerTooltipContent
            name={name}
            lvl={lvl ?? undefined}
            prof={prof ?? undefined}
          />
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!onShowLoots) {
    return playerTrigger;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-context-menu rounded-lg outline-none",
            !highlighted &&
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          tabIndex={0}
          aria-label={t("loots.list.playerActions.label", { name })}
          onClick={(event) => event.stopPropagation()}
        >
          {playerTrigger}
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-56 rounded-xl border-border bg-popover p-1.5 shadow-xl">
        <ContextMenuItem
          className="h-9 cursor-pointer gap-2 rounded-lg px-2.5"
          onSelect={onShowLoots}
        >
          <ListFilter className="size-4 text-primary" />
          {t("loots.list.playerActions.showLoots")}
        </ContextMenuItem>
        <ContextMenuItem
          className="h-9 cursor-pointer gap-2 rounded-lg px-2.5"
          disabled={!profileUrl}
          onSelect={() => {
            if (profileUrl) {
              window.open(profileUrl, "_blank", "noopener,noreferrer");
            }
          }}
        >
          <ExternalLink className="size-4 text-muted-foreground" />
          {t("loots.list.playerActions.openMargonemProfile")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
