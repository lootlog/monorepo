import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
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

  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
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
      </SettingsSection>
    </SettingsTabLayout>
  );
};
