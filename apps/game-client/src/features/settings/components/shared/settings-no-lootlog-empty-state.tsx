import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { Button } from "@/components/ui/button";
import { openLootlogApp } from "@/lib/open-lootlog-app";

/**
 * Stands in for every Lootlog list or picker in settings while the player
 * belongs to no Lootlog, with the same copy and way out as the windows.
 */
export const SettingsNoLootlogEmptyState: FC = () => {
  const { t } = useTranslation("common");

  return (
    <SettingsEmptyState>
      <span className="ll:block ll:font-semibold ll:text-foreground/85">
        {t("noLootlog.title")}
      </span>
      <span className="ll:block">{t("noLootlog.description")}</span>
      <Button
        className="ll:mt-2"
        onClick={() => openLootlogApp()}
        size="xs"
        type="button"
        variant="outline"
      >
        {t("noLootlog.action")}
      </Button>
    </SettingsEmptyState>
  );
};
