import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/empty-state";
import { openLootlogApp } from "@/lib/open-lootlog-app";

export const NoLootlogEmptyState: FC = () => {
  const { t } = useTranslation("common");

  return (
    <EmptyState
      action={{ label: t("noLootlog.action"), onClick: () => openLootlogApp() }}
      description={t("noLootlog.description")}
      title={t("noLootlog.title")}
    />
  );
};
