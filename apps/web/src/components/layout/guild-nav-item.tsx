import type { Guild } from "@/hooks/api/guilds/use-guild";
import { cn } from "@lootlog/ui/lib/utils";
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
import { motion } from "framer-motion";
import { ThemeCircularFrame, useThemeMeta } from "@/themes";

export type GuildNavItemProps = {
  guild: Guild;
  isDragging?: boolean;
  currentGuildId?: string;
};

const GuildNavItemComponent: FC<GuildNavItemProps> = ({
  guild,
  isDragging = false,
  currentGuildId,
}) => {
  const { isRukiaTheme } = useThemeMeta();
  const isActive =
    currentGuildId === guild.id || currentGuildId === guild.vanityUrl;

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const avatarElement = (
    <Avatar
      className={cn(
        "size-11 transition-all duration-200 rounded-lg hover:rounded-lg hover:scale-105",
        isActive && !isRukiaTheme && "border-[3px] border-primary",
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
        <div className="relative w-full flex items-center justify-center mb-2">
          {isActive && !isRukiaTheme && (
            <motion.div
              layoutId="guild-active-pill"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)/0.4]"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <Link
            to={`/${guild.vanityUrl ?? guild.id}` as string}
            draggable={false}
            className="group/guild-item block"
            onClick={handleClick}
            style={{ pointerEvents: isDragging ? "none" : "auto" }}
          >
            <ThemeCircularFrame isActive={isActive}>
              {avatarElement}
            </ThemeCircularFrame>
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
