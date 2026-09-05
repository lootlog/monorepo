import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { SettingsHeader } from "../settings-header";
import { FileText, Plus } from "lucide-react";

type MapTemplatesHeaderProps = {
  onAddClick: () => void;
};

export const MapTemplatesHeader = ({ onAddClick }: MapTemplatesHeaderProps) => {
  const { t } = useTranslation();

  return (
    <SettingsHeader
      icon={FileText}
      title={t("settings.mapTemplates.title")}
      description={t("settings.mapTemplates.description")}
      className="mx-3"
    >
      <Button size="sm" onClick={onAddClick}>
        <Plus className="w-4 h-4 mr-2" />
        {t("settings.mapTemplates.newTemplate")}
      </Button>
    </SettingsHeader>
  );
};
