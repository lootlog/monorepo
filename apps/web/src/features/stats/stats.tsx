import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useTranslation } from "react-i18next";
import {
  useGuildKillStats,
  type GuildKillStatsFilters,
} from "./hooks/use-guild-kill-stats";
import { KillStatsOverview } from "./components/kill-stats-overview";
import { KillStatsFilters } from "./components/kill-stats-filters";
import { KillStatsMemberTable } from "./components/kill-stats-member-table";
import { KillStatsRecentKills } from "./components/kill-stats-recent-kills";

export const Stats: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<GuildKillStatsFilters>({});
  const { data, isLoading } = useGuildKillStats(filters);

  return (
    <div className="flex flex-row w-full h-[calc(100%-65px)]">
      <div className="w-full h-full overflow-auto">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-xl p-0">{t("kills.title")}</h1>
          </div>
        </PageHeader>

        <div className="p-4 space-y-6">
          <KillStatsOverview data={data?.overview} isLoading={isLoading} />

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <KillStatsFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
            <div className="lg:col-span-3 space-y-6">
              <KillStatsMemberTable
                data={data?.memberRanking}
                isLoading={isLoading}
              />
              <KillStatsRecentKills
                data={data?.recentKills}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
