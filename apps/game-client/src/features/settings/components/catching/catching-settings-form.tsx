import type { SettingsSaveBadgeStatus } from "@/components/settings/settings-save-badge";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCharacterCatchingSelection } from "@/hooks/use-character-catching-selection";

type CatchingSettingsFormProps = {
  characterId: string;
  disabled?: boolean;
  /** Trailing actions of the servers section, e.g. "apply to all characters". */
  actions?: ReactNode;
  /** Follows this character's own write: saving, then saved or error. */
  onSaveStateChange?: (status: SettingsSaveBadgeStatus) => void;
};

/** Lootlogi one character plays for: its loot, timers and presence go there. */
export const CatchingSettingsForm: FC<CatchingSettingsFormProps> = ({
  characterId,
  disabled = false,
  actions,
  onSaveStateChange,
}) => {
  const { t } = useTranslation();

  const {
    guilds,
    selectedGuildIds,
    toggle: handleGuildToggle,
    isConfigLoading,
    status: updateStatus,
  } = useCharacterCatchingSelection(characterId);

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
          onToggle={handleGuildToggle}
        />
      </div>
    </SettingsSection>
  );
};
