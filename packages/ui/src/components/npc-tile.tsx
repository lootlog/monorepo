import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

export type NpcTileNpc = {
  icon?: string | null;
  lvl?: number;
  name?: string;
};

type NpcTileProps = {
  className?: string;
  imageClassName?: string;
  levelLabel?: (level: number) => string;
  npc: NpcTileNpc;
  renderTooltip?: (npc: NpcTileNpc) => ReactNode;
};

export const NpcTile: FC<NpcTileProps> = ({
  className = "",
  imageClassName,
  levelLabel = (level) => `lvl ${level}`,
  npc,
  renderTooltip,
}) => {
  const { icon, lvl, name } = npc;
  const sharedTooltip = useSharedTooltip();

  // A fixed box as large as the biggest sprite, so the row never grows when
  // the image arrives.
  const tileClassName = cn(
    "relative flex h-10 w-8 items-center justify-center",
    className,
  );

  const npcIconSource = npcIconUrl(icon ?? "");

  const tooltipContent = renderTooltip?.(npc) ?? (
    <p className="text-foreground">
      {name}
      {lvl !== undefined ? (
        <span className="text-muted-foreground"> ({levelLabel(lvl)})</span>
      ) : null}
    </p>
  );

  const npcImage = (
    <img
      alt={name ?? ""}
      className={cn(
        "relative max-h-10 max-w-8 cursor-pointer rounded-lg",
        imageClassName,
      )}
      src={npcIconSource}
    />
  );

  if (sharedTooltip) {
    return (
      <div
        className={tileClassName}
        onMouseEnter={({ currentTarget }) =>
          sharedTooltip.showTooltip(
            tooltipContent,
            currentTarget.getBoundingClientRect(),
            {
              contentClassName:
                "border-border/50 bg-popover/95 backdrop-blur-md",
              triggerElement: currentTarget,
            },
          )
        }
        onMouseLeave={sharedTooltip.hideTooltip}
      >
        {npcImage}
      </div>
    );
  }

  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger render={<div className={tileClassName} />}>
          {npcImage}
        </TooltipTrigger>
        <TooltipContent className="border-border/50 bg-popover/95 backdrop-blur-md">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
