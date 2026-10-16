import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { KillStatsSearch } from "@/features/kills/components/kill-stats-search";
import type { StatisticsSearch, StatisticsSortTab } from "./statistics-search";

type StatisticsQuerySearchProps = {
  tab: StatisticsSortTab;
  search: StatisticsSearch;
};

/** Narrows a ranking tab by name; the phrase stays in the URL. */
export function StatisticsQuerySearch({
  tab,
  search,
}: StatisticsQuerySearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/@me/statistics" });

  return (
    <KillStatsSearch
      value={search.q ?? ""}
      placeholder={t(`statistics.search.${tab}`)}
      onChange={(q) =>
        // Each keystroke replaces the entry rather than piling up history.
        void navigate({
          replace: true,
          search: (current) => ({ ...current, q: q || undefined }),
        })
      }
    />
  );
}
