import type { UserCurrentGuildResponseDtoOutput as Guild } from "@/lib/api/generated/main/model";
import { cn } from "@/utils/cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { FC, MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeCircularFrame, useThemeMeta } from "@/themes";
import { useTranslation } from "react-i18next";

export type GuildNavItemProps = {
  guild: Guild;
  isDragging?: boolean;
  currentGuildId?: string;
  unreadLootsCount?: number;
};

export const GuildNavItem: FC<GuildNavItemProps> = ({
  guild,
  isDragging = false,
  currentGuildId,
  unreadLootsCount = 0,
}) => {
  const { isRukiaTheme } = useThemeMeta();
  const { t } = useTranslation();
  const isActive =
    currentGuildId === guild.id || currentGuildId === guild.vanityUrl;

  const handleClick = (e: MouseEvent) => {
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
            <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)/0.4]" />
          )}
          <Link
            to={`/${guild.vanityUrl ?? guild.id}` as string}
            draggable={false}
            className="group/guild-item isolate block relative"
            onClick={handleClick}
            style={{ pointerEvents: isDragging ? "none" : "auto" }}
          >
            <ThemeCircularFrame isActive={isActive}>
              {avatarElement}
            </ThemeCircularFrame>
            {unreadLootsCount > 0 && !isActive && (
              <Badge className="absolute -right-2 -top-2 z-20 h-5 min-w-5 justify-center px-1.5 text-[10px] leading-none shadow-md">
                {unreadLootsCount > 99
                  ? t("layout.guildsSelector.unreadLootsOverflow")
                  : unreadLootsCount}
              </Badge>
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
