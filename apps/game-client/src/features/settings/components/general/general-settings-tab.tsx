import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { recordRecentlyChanged } from "@/features/settings/recently-changed.store";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const GeneralSettingsTab: FC = () => {
  const {
    allowWorldSelection,
    animationEffectsEnabled,
    toggleAllowWorldSelection,
    toggleAnimationEffects,
  } = useSettingsStore();

  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.general.behaviorTitle")}>
        <SettingsRow
          controlId="allow-world-selection"
          label={t("settings.general.allowWorldSelectionLabel")}
          description={t("settings.general.allowWorldSelectionDescription")}
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={() => {
              recordRecentlyChanged("allow-world-selection");
              toggleAllowWorldSelection();
            }}
            id="allow-world-selection"
          />
        </SettingsRow>
        <SettingsRow
          controlId="animation-effects"
          label={t("settings.general.animationEffectsLabel")}
          description={t("settings.general.animationEffectsDescription")}
        >
          <Switch
            checked={animationEffectsEnabled}
            onCheckedChange={() => {
              recordRecentlyChanged("animation-effects");
              toggleAnimationEffects();
            }}
            id="animation-effects"
          />
        </SettingsRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
