import {
  MARGONEM_CDN_CHARACTERS_URL,
  getMargonemProfileUrl,
} from "@/constants/margonem";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { ExternalLink, ListFilter } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { PlayerSpriteTile } from "./player-sprite-tile";
import { PlayerTooltipContent } from "./player-tooltip-content";

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

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    sharedTooltip?.showTooltip(
      <PlayerTooltipContent
        name={name}
        lvl={lvl ?? undefined}
        prof={prof ?? undefined}
      />,
      event.currentTarget.getBoundingClientRect(),
      {
        contentClassName: "border-border/50 bg-popover/95",
        triggerElement: event.currentTarget,
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
        aria-label={t("loots.list.playerActions.openMargonemProfile")}
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
      <TooltipProvider delay={100}>
        <Tooltip>
          <TooltipTrigger render={triggerElement} />
          <TooltipContent className="border-border/50 bg-popover/95">
            <PlayerTooltipContent
              name={name}
              lvl={lvl ?? undefined}
              prof={prof ?? undefined}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!onShowLoots) {
    return playerTrigger;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
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
        }
      />
      <ContextMenuContent className="min-w-56 rounded-xl border-border bg-popover p-1.5 shadow-xl">
        <ContextMenuItem
          className="h-9 cursor-pointer gap-2 rounded-lg px-2.5"
          onClick={onShowLoots}
        >
          <ListFilter className="size-4 text-primary" />
          {t("loots.list.playerActions.showLoots")}
        </ContextMenuItem>
        <ContextMenuItem
          className="h-9 cursor-pointer gap-2 rounded-lg px-2.5"
          disabled={!profileUrl}
          onClick={() => {
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
