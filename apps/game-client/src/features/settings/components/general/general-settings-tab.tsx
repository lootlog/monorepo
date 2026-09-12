import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { AddonStatusSection } from "@/features/settings/components/general/addon-status-section";
import { LocalDataSection } from "@/features/settings/components/general/local-data-section";
import { WindowLayoutSection } from "@/features/settings/components/general/window-layout-section";
import { SettingsHelpPopover } from "@/features/settings/components/shared/settings-help-popover";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const GeneralSettingsTab: FC = () => {
  const allowWorldSelection = useSettingsStore(
    (state) => state.allowWorldSelection,
  );

  const toggleAllowWorldSelection = useSettingsStore(
    (state) => state.toggleAllowWorldSelection,
  );

  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const toggleAnimationEffects = useSettingsStore(
    (state) => state.toggleAnimationEffects,
  );

  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <AddonStatusSection />
      <SettingsSection title={t("settings.general.behaviorTitle")}>
        <SettingsRow
          controlId="allow-world-selection"
          htmlFor="allow-world-selection"
          label={t("settings.general.allowWorldSelectionLabel")}
          description={t("settings.general.allowWorldSelectionDescription")}
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={() => {
              toggleAllowWorldSelection();
            }}
            id="allow-world-selection"
          />
        </SettingsRow>
        <SettingsRow
          controlId="animation-effects"
          htmlFor="animation-effects"
          label={
            <span className="ll:inline-flex ll:items-center">
              {t("settings.general.animationEffectsLabel")}
              <SettingsHelpPopover
                recommendation={t("settings.help.animationsRecommendation")}
              />
            </span>
          }
          description={t("settings.general.animationEffectsDescription")}
        >
          <Switch
            checked={animationEffectsEnabled}
            onCheckedChange={() => {
              toggleAnimationEffects();
            }}
            id="animation-effects"
          />
        </SettingsRow>
      </SettingsSection>
      <WindowLayoutSection />
      <LocalDataSection />
    </SettingsTabLayout>
  );
};
