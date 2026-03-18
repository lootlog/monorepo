import type { Guild } from "@/hooks/api/guilds/use-guild";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useTheme } from "@/hooks/context/use-theme";
import { cn } from "@/utils/cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { FrozenCircle } from "@/components/effects/rukia-frost";

export type GuildNavItemProps = {
  guild: Guild;
  isDragging?: boolean;
};

const GuildNavItemComponent: FC<GuildNavItemProps> = ({
  guild,
  isDragging = false,
}) => {
  const guildId = useGuildId();
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";
  const isActive = guildId === guild.id || guildId === guild.vanityUrl;

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const avatarContent = (
    <Avatar
      className={cn(
        "size-12 border-solid border-4 transition-all border-transparent box-border rounded-xl hover:rounded-lg",
        { "border-primary rounded-lg": isActive },
      )}
    >
      <AvatarImage
        src={guild.icon as string}
        alt={guild.name}
        className="pointer-events-none select-none"
      />
      <AvatarFallback className="rounded-none text-white font-medium">
        {guild.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full flex items-center justify-center mb-1">
          <Link
            to={`/${guild.vanityUrl ?? guild.id}` as string}
            draggable={false}
            className="group block"
            onClick={handleClick}
            style={{ pointerEvents: isDragging ? "none" : "auto" }}
          >
            {isRukiaTheme ? (
              <FrozenCircle isActive={isActive} size={48}>
                {avatarContent}
              </FrozenCircle>
            ) : (
              avatarContent
            )}
          </Link>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {guild.name}
      </TooltipContent>
    </Tooltip>
  );
};

export const GuildNavItem = GuildNavItemComponent;
