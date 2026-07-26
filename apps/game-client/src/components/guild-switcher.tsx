import { cn } from "@/lib/utils";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AvatarFallback } from "@/components/ui/avatar";
import { type FC, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatChatUnreadBadge } from "@/features/chat/chat-unread.helpers";
import { GuildButton } from "@/components/guild-button";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/api-client/react-query/main/users";
import { useTranslation } from "react-i18next";
import { getVisibleLootlogGuilds } from "@/lib/selected-lootlog-guild";
import { useCurrentCharacterId } from "@/hooks/use-selected-lootlog-guild";
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

export const GuildSwitcher: FC<GuildSwitcherProps> = ({
  disabled = false,
  allowAll = false,
  className = "",
  gridClassName = "",
  buttonClassName = "",
  layout = "scroll",
  multiple = false,
  onChange,
  onToggle,
  selectedValues,
  unreadCountByGuildId,
  value,
}) => {
  const { t } = useTranslation("common");
  const characterId = useCurrentCharacterId();
  const {
    data: guilds,
    error,
    isFetched,
    isLoading,
    refetch,
  } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });
  const {
    data: userPreferences,
    error: preferencesError,
    isFetched: arePreferencesFetched,
    isLoading: arePreferencesLoading,
    refetch: refetchPreferences,
  } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { setGuildId, guildId } = useSettingsStore(
    useShallow((state) => ({
      setGuildId: state.setGuildId,
      guildId: characterId ? state.guildIdByCharId[characterId] : undefined,
    })),
  );
  const guildsOrder = userPreferences?.guildsOrder;
  const hiddenGuildIds = userPreferences?.hiddenGuildIds;
  const visibleGuilds = getVisibleLootlogGuilds(
    guilds ?? [],
    guildsOrder,
    hiddenGuildIds,
  );
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
      setGuildId(characterId, newGuildId);
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
                  hiddenGuildIds: confirmedHiddenGuildIds,
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

  if ((!guilds && isLoading) || arePreferencesLoading) {
    content = (
      <AsyncStatusIndicator
        active
        delay
        kind="loading"
        label={t("async.loadingGuilds")}
      />
    );
  } else if ((!guilds && error) || preferencesError) {
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
  } else if (
    guilds &&
    isFetched &&
    arePreferencesFetched &&
    visibleGuilds.length === 0
  ) {
    content = (
      <div className="ll:flex ll:items-center ll:gap-2 ll:rounded-md ll:border ll:border-gray-600 ll:bg-gray-900/70 ll:px-2 ll:py-1.5">
        <span className="ll:text-[11px] ll:text-gray-300">
          {t("guildSwitcher.allHidden")}
        </span>
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
          className="ll:size-7"
        >
          <Settings className="ll:size-3.5" />
        </Button>
      </div>
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
