import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC, ReactNode } from "react";

const MARGONEM_CDN_NPCS_URL = "https://micc.garmory-cdn.cloud/obrazki/npc/";

export type NpcTileNpc = {
  icon?: string | null;
  lvl?: number;
  name?: string;
};

type NpcTileProps = {
  className?: string;
  levelLabel?: (level: number) => string;
  npc: NpcTileNpc;
  renderTooltip?: (npc: NpcTileNpc) => ReactNode;
};

export const NpcTile: FC<NpcTileProps> = ({
  className = "",
  levelLabel = (level) => `lvl ${level}`,
  npc,
  renderTooltip,
}) => {
  const { icon, lvl, name } = npc;
  const sharedTooltip = useSharedTooltip();
  const tileClassName = cn("relative w-fit", className);
  const isAbsoluteIconUrl =
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("//"));
  const npcIconSource = isAbsoluteIconUrl
    ? icon
    : `${MARGONEM_CDN_NPCS_URL}${icon ?? ""}`;
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
      className="relative max-h-10 max-w-8 cursor-pointer rounded-lg"
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
