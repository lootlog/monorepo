import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import type { FC } from "react";

type DetectorRoutingGuildPreviewTileProps = {
  className?: string;
  guild: Guild;
};

export const DetectorRoutingGuildPreviewTile: FC<
  DetectorRoutingGuildPreviewTileProps
> = ({ className, guild }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={guild.name}
          className={cn(
            "ll:inline-flex ll:size-7 ll:items-center ll:justify-center ll:overflow-hidden ll:rounded-sm ll:border ll:border-sky-300/45 ll:bg-gray-950/90 ll:shadow-[0_4px_10px_rgba(15,23,42,0.28)]",
            className,
          )}
        >
          <Avatar className="ll:size-full ll:rounded-sm">
            <AvatarImage
              src={guild.icon ?? undefined}
              alt={guild.name}
              className="ll:h-full ll:w-full ll:object-cover"
            />
            <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-sm ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100">
              {guild.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="ll:z-500">
        <p className="ll:text-xs ll:font-semibold">{guild.name}</p>
      </TooltipContent>
    </Tooltip>
  );
};
