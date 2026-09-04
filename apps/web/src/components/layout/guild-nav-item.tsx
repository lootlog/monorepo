import type { UserCurrentGuildResponseDtoOutput as Guild } from "@lootlog/client/main";
import { cn } from "cn";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { Eye, EyeOff } from "lucide-react";

export type GuildNavItemProps = {
  guild: Guild;
  isDragging?: boolean;
  currentGuildId?: string;
  unreadLootsCount?: number;
  isHidden?: boolean;
  onToggleHidden?: () => void;
};

export const GuildNavItem: FC<GuildNavItemProps> = ({
  guild,
  isDragging = false,
  currentGuildId,
  unreadLootsCount = 0,
  isHidden = false,
  onToggleHidden,
}) => {
  const { isRukiaTheme } = useThemeMeta();
  const { t } = useTranslation();
  const isActive =
    currentGuildId === guild.id || currentGuildId === guild.vanityUrl;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isDragging) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.detail > 0) {
      event.currentTarget.blur();
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
        className={cn(
          "pointer-events-none select-none transition-opacity",
          isHidden && "opacity-35",
        )}
      />
      <AvatarFallback
        className={cn(
          "rounded-none font-medium text-white transition-opacity",
          isHidden && "opacity-35",
        )}
      >
        {guild.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="relative mb-2 flex w-full items-center justify-center">
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
                      {isHidden ? (
                        <EyeOff
                          aria-hidden
                          className="pointer-events-none absolute -bottom-1 -right-1 z-20 size-4 rounded-full border border-sidebar-border bg-sidebar p-0.5 text-muted-foreground"
                        />
                      ) : null}
                      {unreadLootsCount > 0 && !isActive && (
                        <Badge className="absolute -right-2 -top-2 z-20 h-5 min-w-5 justify-center px-1.5 text-[10px] leading-none shadow-md">
                          {unreadLootsCount > 99
                            ? t("layout.guildsSelector.unreadLootsOverflow")
                            : unreadLootsCount}
                        </Badge>
                      )}
                    </Link>
                  </div>
                }
              />
              <TooltipContent side="right" className="font-medium">
                <div>{guild.name}</div>
                {isHidden ? (
                  <div className="text-xs font-normal text-muted-foreground">
                    {t("settings.servers.hiddenInGameClient")}
                  </div>
                ) : null}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem onClick={onToggleHidden}>
          {isHidden ? (
            <Eye className="mr-2 size-4" />
          ) : (
            <EyeOff className="mr-2 size-4" />
          )}
          {t(
            isHidden
              ? "settings.servers.showInGameClient"
              : "settings.servers.hideInGameClient",
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
