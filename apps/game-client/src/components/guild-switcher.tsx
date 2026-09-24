import { cn } from "cn";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AvatarFallback } from "@/components/ui/avatar";
import { type FC, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildButton } from "@/components/guild-button";
import { useTranslation } from "react-i18next";
import { useCurrentCharacterId } from "@/hooks/use-selected-lootlog-guild";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useShallow } from "zustand/react/shallow";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuildSwitcherItem } from "@/components/guild-switcher-item";
import { toast } from "sonner";

/**
 * The one Lootlog picker for in-game windows: a flat, full-width tile row the
 * caller wraps in a toolbar strip. Uncontrolled, it drives the character's
 * global selection; with `value`/`onChange` the caller owns the selection
 * (chat also offers the "all" scope).
 */
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
  useEffect(() => {
    if (!isFetched || !arePreferencesFetched || visibleGuilds.length === 0)
      return;

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
    onChange,
    value,
    visibleGuilds,
  ]);

  const selectedValue = value !== undefined ? value : guildId;

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

    // Both writes derive from the cache at the moment they run, so a hide
    // followed by a quick undo, or two hides in a row, never drop each other.
    updatePreferences.mutateFromCurrent(
      (current) => ({
        hiddenGuildIds: [...(current?.hiddenGuildIds ?? []), guildIdToHide],
      }),
      {
        onSuccess: () => {
          toast.success(t("guildSwitcher.hidden", { name: guildName }), {
            action: {
              label: t("actions.undo"),
              onClick: () =>
                updatePreferences.mutateFromCurrent((current) => ({
                  hiddenGuildIds: (current?.hiddenGuildIds ?? []).filter(
                    (hiddenGuildId) => hiddenGuildId !== guildIdToHide,
                  ),
                })),
            },
          });
        },
        onError: () => {
          toast.error(t("guildSwitcher.hideError"));
        },
      },
    );
  };

  // The status fills the strip and borrows its rules instead of drawing its
  // own pill.
  const statusClassName = "ll:mt-0 ll:border-y-0";

  if (status === "single") {
    return null;
  }

  if (status === "hidden") {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "ll:flex ll:h-7 ll:w-full ll:items-center ll:justify-between ll:pl-2 ll:pr-0.5",
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
                size="xs"
                type="button"
                variant="ghost"
                aria-label={t("actions.openSettings")}
                onClick={() =>
                  openAndFocus("settings", {
                    activeTab: "general",
                    activeSubsection: "visibility",
                  })
                }
                className="ll:size-6 ll:shrink-0 ll:bg-transparent ll:text-gray-400 hover:ll:bg-white/5 hover:ll:text-gray-200"
              >
                <Settings className="ll:size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="ll:font-semibold">{t("actions.openSettings")}</p>
            </TooltipContent>
          </Tooltip>
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
          <AvatarFallback className="ll:mt-1.5 ll:rounded-none ll:text-xl ll:font-semibold">
            *
          </AvatarFallback>
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
        <div className="ll:-ml-px ll:flex ll:h-7 ll:w-max ll:min-w-full ll:items-center">
          {content}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};
