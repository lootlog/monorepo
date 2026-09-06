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
        "size-11 rounded-xl after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:ring-2 after:ring-inset after:ring-primary after:opacity-0 after:transition-opacity after:duration-200 motion-reduce:after:transition-none",
        isActive && !isRukiaTheme && "after:opacity-100",
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
                          className="pointer-events-none absolute top-0.5 right-0.5 z-20 size-4 rounded-full border border-sidebar-border bg-sidebar p-0.5 text-muted-foreground"
                        />
                      ) : null}
                      {unreadLootsCount > 0 && !isActive && (
                        <Badge
                          variant="destructive"
                          className="pointer-events-none absolute bottom-0.5 right-0.5 z-20 h-4.5 min-w-4.5 justify-center px-1 text-[9px] leading-none ring-2 ring-sidebar"
                        >
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
