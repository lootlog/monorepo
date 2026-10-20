import { useTranslation } from "react-i18next";
import { PageTabs } from "@/components/layout/page-tabs";
import { ROUTES } from "@/config/routes";

export type FactionWarTab = "overview" | "ranking";

/** The war's sections, pinned under the app bar below its banner. */
export const FactionWarPageTabs = ({
  activeId,
}: {
  activeId: FactionWarTab;
}) => {
  const { t } = useTranslation();

  return (
    <PageTabs
      ariaLabel={t("factionWar.tabs.label")}
      basePath=""
      activeId={activeId}
      tabs={[
        {
          id: "overview",
          label: t("factionWar.tabs.overview"),
          href: ROUTES.user.factionWar.base,
        },
        {
          id: "ranking",
          label: t("factionWar.tabs.ranking"),
          href: ROUTES.user.factionWar.ranking,
        },
      ]}
    />
  );
};
