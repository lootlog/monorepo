import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const InterfaceSettingsTab: FC = () => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const toggleAnimationEffects = useSettingsStore(
    (state) => state.toggleAnimationEffects,
  );

  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.appearance.interfaceTitle")}>
        <SettingsRow
          controlId="animation-effects"
          htmlFor="animation-effects"
          label={t("settings.general.animationEffectsLabel")}
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
    </SettingsTabLayout>
  );
};
