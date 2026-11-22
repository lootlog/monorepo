import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import { useSettingsSaveStatusStore } from "@/lib/settings-persistence/settings-save-status.store";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useCharacterCatchingSelection } from "@/hooks/use-character-catching-selection";

type CatchingSettingsFormProps = {
  characterId: string;
  disabled?: boolean;
  actions?: ReactNode;
};

export const getCatchingSaveKey = (characterId: string) =>
  `lootlogCharacter:${characterId}`;

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

  const toggleGuild = (guildId: string) => {
    useSettingsSaveStatusStore
      .getState()
      .markKeys([getCatchingSaveKey(characterId)], "saving");
    handleGuildToggle(guildId);
  };

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
