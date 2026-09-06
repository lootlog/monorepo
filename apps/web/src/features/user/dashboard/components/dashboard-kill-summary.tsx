import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Mountain, Shield, Sword, Swords } from "lucide-react";
import { cn } from "cn";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useTranslation } from "react-i18next";
import { useKillsControllerGetUserKillStats } from "@lootlog/client/main";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { StatisticsQueryState } from "@/features/user/statistics/statistics-query-state";

export function DashboardKillSummary() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<KillStatsPeriod>("all");
  const [world, setWorld] = useState<string | null>(null);
  const lifetime = useKillsControllerGetUserKillStats(undefined, {
    query: { staleTime: 60_000 },
  });
  const filtered = useKillsControllerGetUserKillStats(
    { world: world ?? undefined, period },
    {
      query: { enabled: world !== null || period !== "all", staleTime: 60_000 },
    },
  );
  const query = world === null && period === "all" ? lifetime : filtered;
  const worlds = Object.keys(lifetime.data?.overview.killsByWorld ?? {});
  const total = query.data?.overview.totalKills ?? 0;
  const categories = [
    {
      key: "ELITE2",
      icon: Sword,
      color: "text-blue-500",
      surface: "bg-blue-500/10",
    },
    {
      key: "HERO",
      icon: Shield,
      color: "text-amber-500",
      surface: "bg-amber-500/10",
    },
    {
      key: "COLOSSUS",
      icon: Flame,
      color: "text-cyan-500",
      surface: "bg-cyan-500/10",
    },
    {
      key: "TITAN",
      icon: Mountain,
      color: "text-red-500",
      surface: "bg-red-500/10",
    },
  ] as const;
  const totalSummary = (
    <dl className="w-[7ch] text-4xl @min-[1000px]/kill-summary:text-5xl">
      <dt className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        {t("statistics.total")}
      </dt>
      <dd className="mt-1 flex h-10 items-center font-semibold tracking-tight tabular-nums @min-[1000px]/kill-summary:h-12">
        {query.isPending ? (
          <Skeleton
            className="h-8 w-full motion-reduce:animate-none @min-[1000px]/kill-summary:h-10"
            aria-hidden="true"
          />
        ) : (
          total.toLocaleString("pl-PL")
        )}
      </dd>
    </dl>
  );
  return (
    <SectionCard className="@container/kill-summary shrink-0">
      <SectionCardHeader
        icon={Swords}
        title={t("statistics.killSummaryTitle")}
        actions={
          <>
            <ChevronLink
              render={
                <Link
                  to="/@me/statistics"
                  search={{
                    tab: "overview",
                    days: 30,
                    world: world ?? undefined,
                  }}
                />
              }
            >
              {t("statistics.title")}
            </ChevronLink>
          </>
        }
      />
      <SectionCardContent
        className="p-4 @min-[800px]/kill-summary:p-5"
        aria-busy={query.isPending}
      >
        {query.isPending && (
          <span role="status" className="sr-only">
            {t("common.loading")}
          </span>
        )}
        <div className="grid gap-5 @min-[800px]/kill-summary:grid-cols-[minmax(320px,1fr)_3fr] @min-[800px]/kill-summary:gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 @min-[800px]/kill-summary:flex-col @min-[800px]/kill-summary:items-start @min-[800px]/kill-summary:justify-center @min-[800px]/kill-summary:border-r @min-[800px]/kill-summary:pr-6">
            <StatisticsQueryState query={query} loading={totalSummary}>
              {totalSummary}
            </StatisticsQueryState>
            <div className="grid w-full min-w-0 grid-cols-2 gap-2 [&>div]:min-w-0">
              <KillStatsPeriodSelect
                value={period}
                onValueChange={setPeriod}
                className="w-full min-w-0"
              />
              <WorldSwitcher
                width="w-full min-w-0"
                value={world}
                onValueChange={setWorld}
                worlds={worlds}
                showAllOption
              />
            </div>
          </div>
          {(query.isPending || query.data !== undefined) && (
            <dl className="grid grid-cols-2 gap-3 @min-[600px]/kill-summary:grid-cols-4">
              {categories.map(({ key, icon: Icon, color, surface }) => {
                const value = query.data?.overview.killsByType[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="min-w-0 rounded-xl bg-muted/30 p-3 @min-[1000px]/kill-summary:p-4"
                  >
                    <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          color,
                          surface,
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      {t(`npcType.${key}`)}
                    </dt>
                    <dd className="mt-4 flex h-8 items-center text-2xl font-semibold tracking-tight tabular-nums">
                      {query.isPending ? (
                        <Skeleton
                          className="h-6 w-20 max-w-full motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        value.toLocaleString("pl-PL")
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
}
