import { useSharedTooltip } from "@/components/shared-tooltip/shared-tooltip-provider";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import { isAbsoluteUrl } from "@/utils/is-absolute-url";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type NpcTileProps = {
  npc: Partial<Npc>;
  className?: string;
};

export const NpcTile: FC<NpcTileProps> = ({
  npc: { lvl, name, icon },
  className = "",
}) => {
  const { t } = useTranslation();
  const sharedTooltip = useSharedTooltip();
  const tileClassName = cn("relative w-fit", className);
  const npcIconSource =
    typeof icon === "string" && isAbsoluteUrl(icon)
      ? icon
      : `${MARGONEM_CDN_NPCS_URL}${icon ?? ""}`;
  const tooltipContent = (
    <p className="text-foreground">
      {name}
      {lvl !== undefined && (
        <span className="text-muted-foreground">
          {" "}
          ({t("common.levelShort", { level: lvl })})
        </span>
      )}
    </p>
  );

  const npcImage = (
    <>
      {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
      <img
        className="relative cursor-pointer rounded-lg max-h-10 max-w-8"
        src={npcIconSource}
        alt={name}
      />
    </>
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
                "bg-popover/95 backdrop-blur-md border-border/50",
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
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className={tileClassName}>{npcImage}</div>
      </TooltipTrigger>
      <TooltipContent className="bg-popover/95 backdrop-blur-md border-border/50">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};
