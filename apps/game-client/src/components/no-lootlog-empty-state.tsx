import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/empty-state";
import { openLootlogApp } from "@/lib/open-lootlog-app";

/**
 * What a Lootlog window shows to a player who belongs to no Lootlog yet:
 * why it is empty and the web app, where they can add the Lootlog bot to
 * their group's Discord server.
 */
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
