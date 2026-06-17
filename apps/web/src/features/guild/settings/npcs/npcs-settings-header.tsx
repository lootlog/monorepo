import { Card } from "@lootlog/ui/components/card";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NpcsSettingsHeader = () => {
  const { t } = useTranslation();

  return (
    <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner shadow-primary/10">
          <Settings2 className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {t("settings.npcs.title")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("settings.npcs.description")}
          </p>
        </div>
      </div>
    </Card>
  );
};
