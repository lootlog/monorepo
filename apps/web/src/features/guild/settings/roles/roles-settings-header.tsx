import { Card } from "@lootlog/ui/components/card";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export const RolesSettingsHeader = () => {
  const { t } = useTranslation();

  return (
    <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner shadow-primary/10">
          <Shield className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {t("settings.roles.title")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("settings.roles.description")}
          </p>
        </div>
      </div>
    </Card>
  );
};
