import {
  MARGONEM_CDN_CHARACTERS_URL,
  getMargonemProfileUrl,
} from "@/constants/margonem";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { ExternalLink, ListFilter } from "lucide-react";
import { useState, type FC, type MouseEvent } from "react";
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

/**
 * A character sprite that shows its details on hover and opens a small
 * action popover on click or tap, so touch users reach the same information
 * and actions as mouse users.
 */
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const profileUrl = getMargonemProfileUrl({
    accountId,
    characterId,
    world,
  });

  const details = (
    <PlayerTooltipContent
      name={name}
      lvl={lvl ?? undefined}
      prof={prof ?? undefined}
    />
  );

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    if (isPopoverOpen) return;

    sharedTooltip?.showTooltip(
      details,
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

  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);

    if (open) {
      sharedTooltip?.hideTooltip();
      setIsTooltipOpen(false);
    }
  };

  const trigger = (
    <button
      type="button"
      aria-label={t("loots.list.playerActions.label", { name })}
      className={cn(
        "inline-flex cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-0 outline-none",
        !highlighted &&
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={(event) => event.stopPropagation()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PlayerSpriteTile
        icon={icon}
        idx={idx}
        color={color}
        className={className}
        cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
      />
    </button>
  );

  return (
    <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
      {sharedTooltip ? (
        <PopoverTrigger render={trigger} />
      ) : (
        <TooltipProvider delay={100}>
          <Tooltip
            open={isTooltipOpen && !isPopoverOpen}
            onOpenChange={setIsTooltipOpen}
          >
            <TooltipTrigger render={<PopoverTrigger render={trigger} />} />
            <TooltipContent className="border-border/50 bg-popover/95">
              {details}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-60 max-w-[calc(100vw-2rem)] border-border bg-popover p-1.5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-2 py-1.5 text-sm">{details}</div>
        {(onShowLoots || profileUrl) && (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border/60 pt-1">
            {onShowLoots && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 justify-start gap-2 px-2 text-sm font-medium"
                onClick={() => {
                  setIsPopoverOpen(false);
                  onShowLoots();
                }}
              >
                <ListFilter className="size-4 text-primary" />
                {t("loots.list.playerActions.showLoots")}
              </Button>
            )}
            {profileUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 justify-start gap-2 px-2 text-sm font-medium"
                render={
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="size-4 text-muted-foreground" />
                {t("loots.list.playerActions.openMargonemProfile")}
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
