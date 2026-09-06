import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Separator } from "@lootlog/ui/components/separator";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useTranslation } from "react-i18next";
import { useKillsControllerGetUserKillStats } from "@lootlog/client/main";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { StatisticsQueryState } from "@/features/user/statistics/statistics-query-state";

export function DashboardKillSummary() {
  const { t } = useTranslation();
  const [world, setWorld] = useState<string | null>(null);
  const lifetime = useKillsControllerGetUserKillStats(undefined, {
    query: { staleTime: 60_000 },
  });
  const filtered = useKillsControllerGetUserKillStats(
    { world: world ?? undefined },
    { query: { enabled: world !== null, staleTime: 60_000 } },
  );
  const query = world === null ? lifetime : filtered;
  const worlds = Object.keys(lifetime.data?.overview.killsByWorld ?? {});
  const counts = [
    { key: "total", value: query.data?.overview.totalKills },
    ...(["ELITE2", "HERO", "COLOSSUS", "TITAN"] as const).map((type) => ({
      key: type,
      value: query.data?.overview.killsByType[type] ?? 0,
    })),
  ];
  return (
    <SectionCard className="@container/kill-summary">
      <SectionCardHeader
        icon={Swords}
        title={t("statistics.killSummaryTitle")}
        description={t("statistics.allTime")}
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
      <SectionCardContent>
        <div className="flex items-center">
          <WorldSwitcher
            width="w-[180px]"
            value={world}
            onValueChange={setWorld}
            worlds={worlds}
            showAllOption
          />
        </div>
        <Separator className="my-3" />
        <StatisticsQueryState query={query}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {counts.map(({ key, value }) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">
                  {key === "total"
                    ? t("statistics.total")
                    : t(`npcType.${key}`)}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {value?.toLocaleString("pl-PL") ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </StatisticsQueryState>
      </SectionCardContent>
    </SectionCard>
  );
}
