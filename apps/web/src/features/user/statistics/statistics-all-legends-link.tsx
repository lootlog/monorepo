import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import type { StatisticsSearch } from "./statistics-search";

export function StatisticsAllLegendsLink({
  search,
}: {
  search: StatisticsSearch;
}) {
  const { t } = useTranslation();

  return (
    <ChevronLink
      render=<Link
        to="/@me/statistics"
        search={{ ...search, tab: "legends", npcType: undefined }}
      />
    >
      {t("statistics.allLegends")}
    </ChevronLink>
  );
}
