import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsHeader } from "../settings-header";
export const NpcsSettingsHeader = () => {
  const { t } = useTranslation();
  return (
    <SettingsHeader
      icon={Settings2}
      title={t("settings.npcs.title")}
      description={t("settings.npcs.description")}
    />
  );
};
