import { PageTabs } from "@/components/layout/page-tabs";
import { useTranslation } from "react-i18next";

export type AbyssSeasonTab = "battles" | "opponents" | "analytics";

type AbyssSeasonTabsProps = {
  seasonId: string;
  characterId: string;
  activeId: AbyssSeasonTab | undefined;
};

export const AbyssSeasonTabs = ({
  seasonId,
  characterId,
  activeId,
}: AbyssSeasonTabsProps) => {
  const { t } = useTranslation();

  return (
    <PageTabs
      ariaLabel={t("battlePanel.abyss.seasonTabs")}
      basePath={`/@me/battle-panel/abyss/${seasonId}`}
      activeId={activeId ?? "battles"}
      tabs={[
        {
          id: "battles",
          label: t("battlePanel.abyss.tabs.battles"),
          href: "",
          search: { characterId },
        },
        {
          id: "opponents",
          label: t("battlePanel.abyss.tabs.opponents"),
          href: "/opponents",
          search: { characterId },
        },
        {
          id: "analytics",
          label: t("battlePanel.abyss.tabs.analytics"),
          href: "/analytics",
          search: { characterId },
        },
      ]}
    />
  );
};
