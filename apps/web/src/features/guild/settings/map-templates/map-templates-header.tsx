import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { FileText, Plus } from "lucide-react";

type MapTemplatesHeaderProps = {
  onAddClick: () => void;
};

export const MapTemplatesHeader = ({ onAddClick }: MapTemplatesHeaderProps) => {
  const { t } = useTranslation();

  return (
    <Card className="mx-3 gap-4 border-border bg-card p-4  shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <FileText className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {t("settings.mapTemplates.title")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("settings.mapTemplates.description")}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onAddClick}>
        <Plus className="w-4 h-4 mr-2" />
        {t("settings.mapTemplates.newTemplate")}
      </Button>
    </Card>
  );
};
