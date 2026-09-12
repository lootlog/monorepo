import type { SettingsSaveBadgeStatus } from "@/components/settings/settings-save-badge";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";
import { useTranslation } from "react-i18next";
import {
  useUsersControllerGetCurrentUserAccessibleGuilds,
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
} from "@lootlog/client/main";

import { useGameStore } from "@/store/game.store";

type CatchingSettingsFormProps = {
  characterId: string;
  disabled?: boolean;
  /** Trailing actions of the servers section, e.g. "apply to all characters". */
  actions?: ReactNode;
  /** Follows this character's own write: saving, then saved or error. */
  onSaveStateChange?: (status: SettingsSaveBadgeStatus) => void;
};

/**
 * Lootlogi one character reports to. The selection is the cached config
 * itself: each toggle writes the next list straight through the mutation,
 * which updates the cache optimistically and serializes rapid clicks, so a
 * click never snaps back when an earlier response lands.
 */
export const CatchingSettingsForm: FC<CatchingSettingsFormProps> = ({
  characterId,
  disabled = false,
  actions,
  onSaveStateChange,
}) => {
  const { t } = useTranslation();
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");

  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId,
    });

  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  const { data: lootlogCharactersConfig, isPending: isLootlogConfigLoading } =
    useUserLootlogConfigControllerGetUserLootlogConfigByAccountId(
      { accountId },
      {
        query: {
          queryKey,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          staleTime: 60_000,
        },
      },
    );

  const {
    mutateFromCurrent: updateLootlogCharacterConfig,
    status: updateStatus,
  } = useUpdateLootlogCharactersConfig();

  // The callback is read through a ref so the report follows the mutation
  // status alone; a parent re-render (e.g. from the report itself) must not
  // re-run it.
  const onSaveStateChangeRef = useRef(onSaveStateChange);

  useEffect(() => {
    onSaveStateChangeRef.current = onSaveStateChange;
  }, [onSaveStateChange]);

  useEffect(() => {
    if (updateStatus === "pending") onSaveStateChangeRef.current?.("saving");
    else if (updateStatus === "success")
      onSaveStateChangeRef.current?.("saved");
    else if (updateStatus === "error") onSaveStateChangeRef.current?.("error");
  }, [updateStatus]);

  const selectedGuildIds =
    lootlogCharactersConfig?.[characterId]?.catchingGuildIds ?? [];

  // The write is optimistic and replaces the whole list, so the picker stays
  // usable while a save is in flight; only the initial load blocks it.
  const isInteractionDisabled = isLootlogConfigLoading || disabled;
  const totalGuilds = guilds?.length ?? 0;
  const selectedCount = selectedGuildIds.length;

  // Derived from the cache at click time, not from this render: a re-render
  // lags the cache by a tick, so the previous click of a rapid series would
  // otherwise be missing from the saved list.
  const handleGuildToggle = (guildId: string) => {
    updateLootlogCharacterConfig((current) => {
      const currentGuildIds = current?.[characterId]?.catchingGuildIds ?? [];

      return {
        characterId,
        catchingGuildIds: currentGuildIds.includes(guildId)
          ? currentGuildIds.filter((id) => id !== guildId)
          : [...currentGuildIds, guildId],
      };
    });
  };

  return (
    <SettingsSection
      controlId="catching-range"
      title={t("settings.catching.form.serversTitle")}
      description={t("settings.catching.form.serversDescription")}
      actions={
        <div className="ll:flex ll:items-center ll:gap-3">
          <span className="ll:text-xs ll:leading-4 ll:tabular-nums ll:text-muted-foreground">
            {t("settings.catching.form.activeCount", {
              selectedCount,
              totalCount: totalGuilds,
            })}
          </span>
          {actions}
        </div>
      }
    >
      {/* Mounted per character, so the fade marks the switch. */}
      <div className="ll:px-2 ll:py-0.5 ll:animate-in ll:fade-in-0 ll:duration-200">
        <SettingsGuildPicker
          aria-label={t("settings.catching.form.serversLabel")}
          guilds={guilds}
          selectedGuildIds={selectedGuildIds}
          disabled={isInteractionDisabled}
          onToggle={handleGuildToggle}
          emptyStateLabel={t("settings.catching.form.emptyGuilds")}
        />
      </div>
    </SettingsSection>
  );
};
