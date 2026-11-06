import type { UserCurrentGuildResponseDtoOutput as Guild } from "@lootlog/client/main";
import { cn } from "cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Tooltip, TooltipTrigger } from "@lootlog/ui/components/tooltip";
import type { FC, MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeCircularFrame } from "@/themes/adapters";
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
import { GuildNavItemTooltip } from "./guild-nav-item-tooltip";
import {
  LOOTLOG_STRIP_TILE_CLASS,
  LootlogStripTile,
} from "./lootlog-strip-tile";

export type GuildNavItemProps = {
  guild: Guild;
  isDragging?: boolean;
  currentGuildId?: string;
  unreadLootsCount?: number;
  isHidden?: boolean;
  onToggleHidden?: () => void;
  /** `strip` is the labelled tile of the phone sheet. */
  variant?: "rail" | "strip";
  onSelect?: () => void;
};

export const GuildNavItem: FC<GuildNavItemProps> = ({
  guild,
  isDragging = false,
  currentGuildId,
  unreadLootsCount = 0,
  isHidden = false,
  onToggleHidden,
  variant = "rail",
  onSelect,
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

    onSelect?.();
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

  const marks = (
    <GuildNavItemMarks
      isHidden={isHidden}
      isLocked={isLocked}
      unreadLootsCount={isActive ? 0 : unreadLootsCount}
    />
  );

  const linkProps = {
    to: "/$guildId",
    params: { guildId: guild.vanityUrl ?? guild.id },
    draggable: false,
    onClick: handleClick,
    style: { pointerEvents: isDragging ? "none" : "auto" },
  } as const;

  const trigger =
    variant === "strip" ? (
      <Link
        {...linkProps}
        data-active={isActive || undefined}
        className={LOOTLOG_STRIP_TILE_CLASS}
      >
        <LootlogStripTile label={guild.name} isActive={isActive}>
          <ThemeCircularFrame isActive={isActive}>
            {avatarElement}
          </ThemeCircularFrame>
          {marks}
        </LootlogStripTile>
      </Link>
    ) : (
      <div>
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="group/rail-item relative mb-2 flex w-full items-center justify-center">
                <RailItemIndicator isActive={isActive} />
                <Link
                  {...linkProps}
                  className="group/guild-item isolate block relative"
                >
                  <ThemeCircularFrame isActive={isActive}>
                    {avatarElement}
                  </ThemeCircularFrame>
                  {marks}
                </Link>
              </div>
            }
          />
          <GuildNavItemTooltip
            name={guild.name}
            isLocked={isLocked}
            isHidden={isHidden}
          />
        </Tooltip>
      </div>
    );

  return (
    <ContextMenu>
      <ContextMenuTrigger render={trigger} />
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
