import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useCharacterCatchingSelection } from "@/hooks/use-character-catching-selection";

type CatchingSettingsFormProps = {
  characterId: string;
  disabled?: boolean;
  /** Trailing actions of the servers section, e.g. "apply to all characters". */
  actions?: ReactNode;
};

/**
 * Save mark key of one character's Lootlogi. The mark lives in the shared
 * save status store, so it resolves with the write even after this form
 * unmounts (e.g. the player switched to another character mid-save).
 */
export const getCatchingSaveKey = (characterId: string) =>
  `lootlogCharacter:${characterId}`;

/** Lootlogi one character plays for: its loot, timers and presence go there. */
export const CatchingSettingsForm: FC<CatchingSettingsFormProps> = ({
  characterId,
  disabled = false,
  actions,
}) => {
  const { t } = useTranslation();

  const {
    guilds,
    selectedGuildIds,
    toggle: handleGuildToggle,
    isConfigLoading,
  } = useCharacterCatchingSelection(characterId);

  // The mutation reports its outcome to the store, which resolves this mark.
  const toggleGuild = (guildId: string) => {
    useSettingsSaveStatusStore
      .getState()
      .markKeys([getCatchingSaveKey(characterId)], "saving");
    handleGuildToggle(guildId);
  };

  // The write is optimistic and replaces the whole list, so the picker stays
  // usable while a save is in flight; only the initial load blocks it.
  const isInteractionDisabled = isConfigLoading || disabled;
  const totalGuilds = guilds.length;
  const selectedCount = selectedGuildIds.length;

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
          onToggle={toggleGuild}
        />
      </div>
    </SettingsSection>
  );
};
