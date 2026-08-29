import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Alert, AlertTitle } from "@lootlog/ui/components/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@lootlog/ui/components/empty";
import { CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { UserKillStatsResponseDtoOutput } from "@lootlog/api-client/models/main/user-kill-stats-response-dto-output";

const NPC_TYPE_ORDER = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
] as const;

const capitalizeFirst = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

type PlayerKillStatsPanelProps = {
  data?: UserKillStatsResponseDtoOutput;
  hasActiveFilters: boolean;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
};

export const PlayerKillStatsPanel: React.FC<PlayerKillStatsPanelProps> = ({
  data,
  hasActiveFilters,
  isError,
  isLoading,
  onRetry,
}) => {
  const { t } = useTranslation();
  const totalKills = data?.overview.totalKills;
  let content: ReactNode;

  if (isLoading) {
    content = (
      <div className="grid @xl/overview:grid-cols-2">
        <div className="border-b border-border/70 px-3 py-3 @xl/overview:border-r @xl/overview:border-b-0">
          <Skeleton className="h-3 w-28" />
          <div className="mt-1 space-y-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="px-3 py-3">
          <Skeleton className="h-3 w-28" />
          <div className="mt-1 space-y-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  } else if (isError && !data) {
    content = (
      <Alert variant="destructive" className="m-3 w-auto">
        <CircleAlert />
        <AlertTitle>{t("kills.playerStats.loadError")}</AlertTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-fit min-h-11 lg:min-h-9"
          onClick={onRetry}
        >
          <RefreshCw data-icon="inline-start" />
          {t("common.actions.retry")}
        </Button>
      </Alert>
    );
  } else if (!data || data.overview.totalKills === 0) {
    content = (
      <Empty className="min-h-40 border-0 bg-transparent p-3">
        <EmptyHeader>
          <EmptyTitle>
            {t(
              hasActiveFilters
                ? "kills.playerStats.filteredNoData"
                : "kills.playerStats.noData",
            )}
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  } else {
    const activeNpcTypeEntries = NPC_TYPE_ORDER.map((type) => {
      const count = data.overview.killsByType[type] ?? 0;
      return { count, type };
    }).filter(({ count }) => count > 0);
    const worldEntries = Object.entries(data.overview.killsByWorld)
      .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
      .slice(0, 5);

    content = (
      <div className="grid @xl/overview:grid-cols-2">
        {activeNpcTypeEntries.length > 0 ? (
          <section
            aria-labelledby="dashboard-kills-by-type-title"
            className="min-w-0 border-b border-border/70 px-3 py-3 @xl/overview:border-r @xl/overview:border-b-0"
          >
            <h4
              id="dashboard-kills-by-type-title"
              className="text-[11px] font-medium text-muted-foreground"
            >
              {t("kills.overview.killsByType")}
            </h4>
            <ul className="mt-1">
              {activeNpcTypeEntries.map(({ count, type }) => (
                <li
                  key={type}
                  className="flex min-h-9 min-w-0 items-center justify-between gap-3 border-b border-border/60 py-2"
                >
                  <span className="truncate text-sm">
                    {t(`npcType.${type}`)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {worldEntries.length > 0 ? (
          <section
            aria-labelledby="dashboard-kills-by-world-title"
            className="min-w-0 px-3 py-3"
          >
            <h4
              id="dashboard-kills-by-world-title"
              className="text-[11px] font-medium text-muted-foreground"
            >
              {t("kills.playerStats.killsByWorld")}
            </h4>
            <ul className="mt-1 divide-y divide-border/60">
              {worldEntries.map(([worldName, count]) => (
                <li
                  key={worldName}
                  className="flex min-h-9 min-w-0 items-center justify-between gap-3 py-2"
                >
                  <span className="truncate text-sm">
                    {capitalizeFirst(worldName)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="dashboard-kill-overview-title"
      aria-busy={isLoading}
      className="@container/overview min-w-0"
    >
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
        <h3
          id="dashboard-kill-overview-title"
          className="text-sm font-semibold"
        >
          {t("kills.overview.title")}
        </h3>
        <dl className="flex shrink-0 items-baseline gap-2">
          <dt className="text-xs font-medium text-muted-foreground">
            {t("kills.overview.totalKills")}
          </dt>
          <dd
            aria-live="polite"
            className="text-xl font-bold tracking-[-0.03em] tabular-nums"
          >
            {isLoading && totalKills === undefined ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              (totalKills?.toLocaleString() ?? "—")
            )}
          </dd>
        </dl>
      </header>
      {content}
    </section>
  );
};
