import type { UserCurrentGuildResponseDtoOutput as Guild } from "@lootlog/client/main";
import { cn } from "cn";
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
import type { FC, MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeCircularFrame } from "@/themes";
import { RailItemIndicator } from "./rail-item-indicator";
import { useTranslation } from "react-i18next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { Eye, EyeOff } from "lucide-react";
import { GuildNavItemMarks } from "./guild-nav-item-marks";

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
  const { t } = useTranslation();

  const isActive =
    currentGuildId === guild.id || currentGuildId === guild.vanityUrl;

  // Stale access data may already be outdated, so it never shows a lock.
  const isLocked = !guild.hasLootlogAccess && !guild.isAccessDataStale;

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
    <Avatar className="size-11 rounded-lg">
      <AvatarImage
        src={guild.icon ?? undefined}
        alt={guild.name}
        className={cn(
          "pointer-events-none select-none transition-[opacity,filter]",
          isLocked && "opacity-60 grayscale",
          isHidden && "opacity-35",
        )}
      />
      <AvatarFallback
        className={cn(
          "rounded-none font-medium text-white transition-opacity",
          isLocked && "opacity-60",
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
                  <div className="group/rail-item relative mb-2 flex w-full items-center justify-center">
                    <RailItemIndicator isActive={isActive} />
                    <Link
                      to="/$guildId"
                      params={{ guildId: guild.vanityUrl ?? guild.id }}
                      draggable={false}
                      className="group/guild-item isolate block relative"
                      onClick={handleClick}
                      style={{ pointerEvents: isDragging ? "none" : "auto" }}
                    >
                      <ThemeCircularFrame isActive={isActive}>
                        {avatarElement}
                      </ThemeCircularFrame>
                      <GuildNavItemMarks
                        isHidden={isHidden}
                        isLocked={isLocked}
                        unreadLootsCount={isActive ? 0 : unreadLootsCount}
                      />
                    </Link>
                  </div>
                }
              />
              <TooltipContent side="right" className="font-medium">
                <div>{guild.name}</div>
                {isLocked ? (
                  <div className="text-xs font-normal text-muted-foreground">
                    {t("layout.guildsSelector.noAccess")}
                  </div>
                ) : null}
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
