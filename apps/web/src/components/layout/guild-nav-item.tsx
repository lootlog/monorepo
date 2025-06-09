import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Guild } from "@/hooks/api/use-guild";
import { useGuildId } from "@/hooks/use-guild-id";
import { cn } from "@/utils/cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { FC } from "react";
import { Link } from "react-router-dom";

export type GuildNavItemProps = {
  guild: Guild;
};

export const GuildNavItem: FC<GuildNavItemProps> = ({ guild }) => {
  const guildId = useGuildId();
  const isActive = guildId === guild.id || guildId === guild.vanityUrl;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Link to={`/${guild.vanityUrl ?? guild.id}`}>
          <Avatar
            className={cn(
              "size-12 border-solid border-4 transition-all border-transparent box-border rounded-xl",
              { "border-primary": isActive }
            )}
          >
            <AvatarImage src={guild.icon as string} alt={guild.name} />
            <AvatarFallback className="rounded-none">
              {guild.name[0]}
            </AvatarFallback>
          </Avatar>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{guild.name}</TooltipContent>
    </Tooltip>
  );
};
