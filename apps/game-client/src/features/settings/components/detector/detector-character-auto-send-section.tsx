import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Switch } from "@/components/ui/switch";
import { useSettingField } from "@/features/settings/persistence/use-setting-field";
import { useTranslation } from "react-i18next";

export const DetectorCharacterAutoSendSection = () => {
  const { t } = useTranslation();

  const { value, setValue } = useSettingField(
    "gameData.detectorAutoSendEnabled",
  );

  return (
    <SettingsSection title={t("settings.detector.characterTitle")}>
      <SettingsRow
        controlId="detector-character-auto-send"
        htmlFor="detector-character-auto-send"
        label={t("settings.detector.characterAutoSend.label")}
        description={t("settings.detector.characterAutoSend.description")}
      >
        <Switch
          id="detector-character-auto-send"
          checked={value}
          onCheckedChange={(checked) => setValue(checked)}
        />
      </SettingsRow>
    </SettingsSection>
  );
};
