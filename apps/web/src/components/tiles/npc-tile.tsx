import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { cn } from "@lootlog/ui/lib/utils";

import type { FC } from "react";
import type { Npc } from "@/hooks/api/game-data/use-npcs";

type NpcTileProps = {
  npc: Partial<Npc>;
  className?: string;
};

export const NpcTile: FC<NpcTileProps> = ({
  npc: { id, lvl, name, icon },
  className = "",
}) => {
  return (
    <TooltipProvider key={id}>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className={cn("relative", className)}>
            {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
            <img
              className="relative cursor-pointer rounded-lg max-h-10 max-w-8"
              src={`${MARGONEM_CDN_NPCS_URL}${icon}`}
              alt={name}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover/95 backdrop-blur-md border-border/50">
          <p className="text-foreground">
            {name}
            {lvl !== undefined && (
              <span className="text-muted-foreground"> (Lvl {lvl})</span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
