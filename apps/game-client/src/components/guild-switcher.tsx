import { cn } from "@/lib/utils";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { getPresenceClanKey } from "@/lib/presence-organization-selection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AvatarFallback } from "@/components/ui/avatar";
import { type FC, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatChatUnreadBadge } from "@/features/chat/chat-unread.helpers";
import { GuildButton } from "@/components/guild-button";
import { useTranslation } from "react-i18next";
import { useCurrentCharacterId } from "@/hooks/use-selected-lootlog-guild";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import { useShallow } from "zustand/react/shallow";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuildSwitcherItem } from "@/components/guild-switcher-item";
import { toast } from "sonner";

type GuildSwitcherProps = {
  disabled?: boolean;
  allowAll?: boolean;
  className?: string;
  gridClassName?: string;
  buttonClassName?: string;
  layout?: "scroll" | "grid";
  multiple?: boolean;
  onChange?: (guildId: string) => void;
  onToggle?: (guildId: string) => void;
  selectedValues?: string[];
  unreadCountByGuildId?: Record<string, number>;
  value?: string;
};

const resolveGuildSwitcherProps = (props: GuildSwitcherProps) => ({
  ...props,
  allowAll: props.allowAll ?? false,
  buttonClassName: props.buttonClassName ?? "",
  className: props.className ?? "",
  disabled: props.disabled ?? false,
  gridClassName: props.gridClassName ?? "",
  layout: props.layout ?? "scroll",
  multiple: props.multiple ?? false,
});

type GuildSwitcherStatusInput = {
  arePreferencesFetched: boolean;
  arePreferencesLoading: boolean;
  hasGuilds: boolean;
  hasGuildsError: boolean;
  hasPreferences: boolean;
  hasPreferencesError: boolean;
  isFetched: boolean;
  isLoading: boolean;
  visibleGuildCount: number;
};

const getGuildSwitcherStatus = ({
  arePreferencesFetched,
  arePreferencesLoading,
  hasGuilds,
  hasGuildsError,
  hasPreferences,
  hasPreferencesError,
  isFetched,
  isLoading,
  visibleGuildCount,
}: GuildSwitcherStatusInput) => {
  const hasResolvedGuilds = hasGuilds && isFetched && arePreferencesFetched;
  if (hasResolvedGuilds && visibleGuildCount === 1) {
    return "single" as const;
  }
  if (hasResolvedGuilds && visibleGuildCount === 0) {
    return "hidden" as const;
  }
  if ((!hasGuilds && isLoading) || (!hasPreferences && arePreferencesLoading)) {
    return "loading" as const;
  }
  if (
    (!hasGuilds && hasGuildsError) ||
    (!hasPreferences && hasPreferencesError)
  ) {
    return "error" as const;
  }
  return "ready" as const;
};

export const GuildSwitcher: FC<GuildSwitcherProps> = (props) => {
  const {
    disabled,
    allowAll,
    className,
    gridClassName,
    buttonClassName,
    layout,
    multiple,
    onChange,
    onToggle,
    selectedValues,
    unreadCountByGuildId,
    value,
  } = resolveGuildSwitcherProps(props);
  const { t } = useTranslation("common");
  const characterId = useCurrentCharacterId();
  const currentClanKey = useGameStore((state) => {
    const game = state.game;
    return game?.hero.clan
      ? getPresenceClanKey(game.world, game.hero.clan.id)
      : undefined;
  });
  const { guildsQuery, preferencesQuery, visibleGuilds } =
    useVisibleLootlogGuilds();
  const { data: guilds, error, isFetched, isLoading, refetch } = guildsQuery;
  const {
    data: userPreferences,
    error: preferencesError,
    isFetched: arePreferencesFetched,
    isLoading: arePreferencesLoading,
    refetch: refetchPreferences,
  } = preferencesQuery;
  const updatePreferences = useUpdateUserPreferences();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { setGuildId, guildId } = useSettingsStore(
    useShallow((state) => ({
      setGuildId: state.setGuildId,
      guildId: characterId ? state.guildIdByCharId[characterId] : undefined,
    })),
  );
  const hiddenGuildIds = userPreferences?.hiddenGuildIds;
  const latestHiddenGuildIds = useRef(hiddenGuildIds ?? []);
  useEffect(() => {
    latestHiddenGuildIds.current = hiddenGuildIds ?? [];
  }, [hiddenGuildIds]);
  useEffect(() => {
    if (!isFetched || !arePreferencesFetched || visibleGuilds.length === 0)
      return;
    if (multiple) return;
    if (!onChange) return;
    const currentValue = value;
    if (allowAll && currentValue === "all") return;
    const exists = visibleGuilds.some((guild) => guild.id === currentValue);
    if (exists) return;
    onChange(visibleGuilds[0].id);
  }, [
    allowAll,
    arePreferencesFetched,
    isFetched,
    multiple,
    onChange,
    value,
    visibleGuilds,
  ]);

  const selectedValue = value !== undefined ? value : guildId;
  const selectedGuildIds = selectedValues ?? [];
  const resolvedButtonClassName = buttonClassName;
  const status = getGuildSwitcherStatus({
    arePreferencesFetched,
    arePreferencesLoading,
    hasGuilds: Boolean(guilds),
    hasGuildsError: Boolean(error),
    hasPreferences: Boolean(userPreferences),
    hasPreferencesError: Boolean(preferencesError),
    isFetched,
    isLoading,
    visibleGuildCount: visibleGuilds.length,
  });

  const handleChange = (newGuildId: string) => {
    if (disabled) return;

    if (multiple) {
      onToggle?.(newGuildId);
      return;
    }

    if (onChange) {
      onChange(newGuildId);
      return;
    }

    if (characterId) {
      setGuildId(characterId, newGuildId, currentClanKey);
    }
  };

  const hideGuild = (guildIdToHide: string, guildName: string) => {
    const confirmedHiddenGuildIds = hiddenGuildIds ?? [];
    if (confirmedHiddenGuildIds.includes(guildIdToHide)) {
      return;
    }

    updatePreferences.mutate(
      {
        hiddenGuildIds: [...confirmedHiddenGuildIds, guildIdToHide],
      },
      {
        onSuccess: () => {
          toast.success(t("guildSwitcher.hidden", { name: guildName }), {
            action: {
              label: t("actions.undo"),
              onClick: () =>
                updatePreferences.mutate({
                  hiddenGuildIds: latestHiddenGuildIds.current.filter(
                    (hiddenGuildId) => hiddenGuildId !== guildIdToHide,
                  ),
                }),
            },
          });
        },
        onError: () => {
          toast.error(t("guildSwitcher.hideError"));
        },
      },
    );
  };

  if (status === "single") {
    return null;
  }

  if (status === "hidden") {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "ll:mt-1 ll:flex ll:h-7 ll:w-full ll:items-center ll:justify-between ll:box-border ll:rounded-sm ll:border ll:border-gray-700/90 ll:bg-gray-900/60 ll:pl-2 ll:pr-0.5",
            className,
          )}
          role="status"
        >
          <span className="ll:min-w-0 ll:flex-1 ll:truncate ll:text-[11px] ll:text-gray-300">
            {t("guildSwitcher.allHidden")}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label={t("actions.openSettings")}
                onClick={() =>
                  setOpen("settings", true, {
                    activeTab: "servers",
                    activeSubsection: "visibility",
                  })
                }
                className="ll:size-6 ll:shrink-0 ll:border-gray-700/90 ll:bg-transparent ll:text-gray-400 hover:ll:bg-gray-800/70 hover:ll:text-gray-200"
              >
                <Settings className="ll:size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="ll:z-500">
              <p className="ll:text-xs ll:font-semibold">
                {t("actions.openSettings")}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  let content = (
    <>
      {allowAll && !multiple && visibleGuilds.length > 0 && (
        <GuildButton
          key="all"
          isSelected={"all" === selectedValue}
          disabled={disabled}
          onClick={() => handleChange("all")}
          tooltipLabel={t("guildSwitcher.allServers")}
          className={resolvedButtonClassName}
          unreadBadge={null}
        >
          <AvatarFallback className="ll:font-semibold ll:text-xl ll:mt-1.5">
            *
          </AvatarFallback>
        </GuildButton>
      )}
      {visibleGuilds.map((guild) => (
        <GuildSwitcherItem
          key={guild.id}
          isSelected={
            multiple
              ? selectedGuildIds.includes(guild.id)
              : guild.id === selectedValue
          }
          disabled={disabled}
          onClick={() => handleChange(guild.id)}
          onHide={() => hideGuild(guild.id, guild.name)}
          hideLabel={t("guildSwitcher.hideInGameClient")}
          guild={guild}
          buttonClassName={resolvedButtonClassName}
          unreadBadge={formatChatUnreadBadge(unreadCountByGuildId?.[guild.id])}
        />
      ))}
    </>
  );

  if (status === "loading") {
    content = (
      <AsyncStatusIndicator
        active
        delay
        kind="loading"
        label={t("async.loadingGuilds")}
      />
    );
  } else if (status === "error") {
    content = (
      <AsyncStatusIndicator
        active
        kind="error"
        label={t("async.guildsError")}
        onRetry={() => {
          void Promise.all([refetch(), refetchPreferences()]);
        }}
        retryLabel={t("actions.retry")}
      />
    );
  }

  if (layout === "grid") {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "ll:mt-1 ll:grid ll:grid-cols-4 ll:gap-1",
            className,
            gridClassName,
          )}
        >
          {content}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea
        className={cn("ll:w-full", className)}
        orientation="horizontal"
      >
        <div className="ll:mt-1 ll:flex ll:w-max ll:min-w-full ll:gap-1">
          {content}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};
