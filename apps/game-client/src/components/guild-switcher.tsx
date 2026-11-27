import { cn } from "cn";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { FC } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildButton } from "@/components/guild-button";
import { useTranslation } from "react-i18next";
import { useCurrentCharacterId } from "@/hooks/use-selected-lootlog-guild";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useShallow } from "zustand/react/shallow";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { GuildSwitcherItem } from "@/components/guild-switcher-item";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

type GuildSwitcherProps = {
  allowAll?: boolean;
  className?: string;
  onChange?: (guildId: string) => void;
  unreadGuildIds?: ReadonlySet<string>;
  value?: string;
};

type GuildSwitcherStatusInput = {
  arePreferencesFetched: boolean;
  arePreferencesLoading: boolean;
  guildCount: number;
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
  guildCount,
  hasGuilds,
  hasGuildsError,
  hasPreferences,
  hasPreferencesError,
  isFetched,
  isLoading,
  visibleGuildCount,
}: GuildSwitcherStatusInput) => {
  if (hasGuilds && isFetched && guildCount === 0) {
    return "none" as const;
  }

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

export const GuildSwitcher: FC<GuildSwitcherProps> = ({
  allowAll = false,
  className,
  onChange,
  unreadGuildIds,
  value,
}) => {
  const { t } = useTranslation("common");
  const characterId = useCurrentCharacterId();

  const { guildsQuery, preferencesQuery, visibleGuilds } = useLootlogGuilds();

  const { data: guilds, error, isFetched, isLoading, refetch } = guildsQuery;

  const {
    data: userPreferences,
    error: preferencesError,
    isFetched: arePreferencesFetched,
    isLoading: arePreferencesLoading,
    refetch: refetchPreferences,
  } = preferencesQuery;

  const updatePreferences = useUpdateUserPreferences();
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);

  const { setGuildId, guildId } = useSettingsStore(
    useShallow((state) => ({
      setGuildId: state.setGuildId,
      guildId: characterId ? state.guildIdByCharId[characterId] : undefined,
    })),
  );

  const hiddenGuildIds = userPreferences?.hiddenGuildIds;

  const selectedValue = value !== undefined ? value : guildId;

  const status = getGuildSwitcherStatus({
    arePreferencesFetched,
    arePreferencesLoading,
    guildCount: guilds?.length ?? 0,
    hasGuilds: Boolean(guilds),
    hasGuildsError: Boolean(error),
    hasPreferences: Boolean(userPreferences),
    hasPreferencesError: Boolean(preferencesError),
    isFetched,
    isLoading,
    visibleGuildCount: visibleGuilds.length,
  });

  const handleChange = (newGuildId: string) => {
    if (onChange) {
      onChange(newGuildId);

      return;
    }

    if (characterId) {
      setGuildId(characterId, newGuildId);
    }
  };

  const hideGuild = (guildIdToHide: string, guildName: string) => {
    if (hiddenGuildIds?.includes(guildIdToHide)) {
      return;
    }

    updatePreferences.mutateFromCurrent(
      (current) => ({
        hiddenGuildIds: [...(current?.hiddenGuildIds ?? []), guildIdToHide],
      }),
      {
        onSuccess: () => {
          showRuntimeMessage(t("guildSwitcher.hidden", { name: guildName }));
        },
        onError: () => {
          showRuntimeMessage(t("guildSwitcher.hideError"));
        },
      },
    );
  };

  const statusClassName = "ll:mt-0 ll:border-y-0";

  if (status === "single" || status === "none") {
    return null;
  }

  if (status === "hidden") {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "ll:flex ll:h-7 ll:w-full ll:items-center ll:justify-between ll:pl-2 ll:pr-0.5 ll:mobile:h-10",
            className,
          )}
          role="status"
        >
          <span className="ll:min-w-0 ll:flex-1 ll:truncate ll:text-[11px] ll:text-foreground/80">
            {t("guildSwitcher.allHidden")}
          </span>
          <IconButton
            label={t("actions.openSettings")}
            onClick={() =>
              openAndFocus("settings", {
                activeTab: "general",
                activeSubsection: "visibility",
              })
            }
          >
            <Settings aria-hidden />
          </IconButton>
        </div>
      </TooltipProvider>
    );
  }

  let content = (
    <>
      {allowAll && visibleGuilds.length > 0 && (
        <GuildButton
          key="all"
          isSelected={"all" === selectedValue}
          onClick={() => handleChange("all")}
          tooltipLabel={t("guildSwitcher.allServers")}
          unreadLabel={null}
        >
          <Avatar aria-hidden className="ll:size-5 ll:text-base">
            <AvatarFallback className="ll:pt-1.5">*</AvatarFallback>
          </Avatar>
        </GuildButton>
      )}
      {visibleGuilds.map((guild) => (
        <GuildSwitcherItem
          key={guild.id}
          isSelected={guild.id === selectedValue}
          onClick={() => handleChange(guild.id)}
          onHide={() => hideGuild(guild.id, guild.name)}
          hideLabel={t("guildSwitcher.hideInGameClient")}
          guild={guild}
          unreadLabel={
            unreadGuildIds?.has(guild.id) ? t("guildSwitcher.unread") : null
          }
        />
      ))}
    </>
  );

  if (status === "loading") {
    content = (
      <AsyncStatusIndicator
        active
        className={statusClassName}
        delay
        kind="loading"
        layout="strip"
        label={t("async.loadingGuilds")}
      />
    );
  } else if (status === "error") {
    content = (
      <AsyncStatusIndicator
        active
        className={statusClassName}
        kind="error"
        layout="strip"
        label={t("async.guildsError")}
        onRetry={() => {
          void Promise.all([refetch(), refetchPreferences()]);
        }}
        retryLabel={t("actions.retry")}
      />
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea
        className={cn("ll:w-full", className)}
        orientation="horizontal"
      >
        <div className="ll:-ml-px ll:flex ll:h-7 ll:w-max ll:min-w-full ll:items-center ll:mobile:h-10">
          {content}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};
