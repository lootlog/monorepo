import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import {
  useKillsControllerGetUserKillAnalytics,
  useKillsControllerGetUserKillStats,
} from "@lootlog/client/main";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PageHeader } from "@/components/common/page-header";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { StatisticsQueryState } from "./statistics-query-state";
import {
  STATISTICS_DAYS,
  STATISTICS_TABS,
  type StatisticsSearch,
} from "./statistics-search";
import { StatisticsContent } from "./statistics-content";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";

export function Statistics() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/_authenticated/@me/statistics" });
  const navigate = useNavigate({ from: "/@me/statistics" });
  const update = (changes: Partial<StatisticsSearch>) => {
    void navigate({ search: (current) => ({ ...current, ...changes }) });
  };
  const analytics = useKillsControllerGetUserKillAnalytics(
    {
      days: ({ 7: "7", 30: "30", 90: "90", 365: "365" } as const)[search.days],
      world: search.world,
    },
    { query: { staleTime: 30_000 } },
  );
  const lifetime = useKillsControllerGetUserKillStats(undefined, {
    query: { staleTime: 60_000 },
  });
  const worlds = Object.keys(lifetime.data?.overview.killsByWorld ?? {});
  if (search.world && !worlds.includes(search.world)) worlds.push(search.world);
  const data = analytics.data;
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="min-w-0 space-y-3 p-3">
        <PageHeader
          className="@container/page-heading [&>header>div:last-child]:basis-full @2xl/page-heading:[&>header>div:last-child]:basis-auto"
          icon={BarChart3}
          title={t("statistics.title")}
          description={t("statistics.description")}
          actions={
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <label className="space-y-1 text-xs">
                <span className="block text-muted-foreground">
                  {t("statistics.period")}
                </span>
                <select
                  value={search.days}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  onChange={(event) => {
                    const days = STATISTICS_DAYS.find(
                      (day) => day === Number(event.target.value),
                    );
                    if (days) update({ days });
                  }}
                >
                  {STATISTICS_DAYS.map((days) => (
                    <option key={days} value={days}>
                      {t("statistics.days", { count: days })}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1">
                <span className="block text-xs text-muted-foreground">
                  {t("statistics.world")}
                </span>
                <WorldSwitcher
                  value={search.world ?? null}
                  onValueChange={(world) =>
                    update({ world: world ?? undefined })
                  }
                  worlds={worlds}
                  showAllOption
                  triggerClassName="h-10"
                />
              </div>
            </div>
          }
        />
        <HorizontalMenu
          ariaLabel={t("statistics.title")}
          className="p-0"
          activeId={search.tab}
          items={STATISTICS_TABS.map((tab) => ({
            id: tab,
            label: t(`statistics.${tab}`),
            href: "/@me/statistics",
            search: { ...search, tab },
          }))}
        />
        <StatisticsQueryState query={analytics}>
          {data && (
            <StatisticsContent
              data={data}
              tab={search.tab}
              onClearWorld={() => update({ world: undefined })}
            />
          )}
        </StatisticsQueryState>
      </div>
    </ScrollArea>
  );
}
