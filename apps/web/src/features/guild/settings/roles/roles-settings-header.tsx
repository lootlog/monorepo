import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsHeader } from "../settings-header";
export const RolesSettingsHeader = () => {
  const { t } = useTranslation();
  return (
    <SettingsHeader
      icon={Shield}
      title={t("settings.roles.title")}
      description={t("settings.roles.description")}
    />
  );
};
