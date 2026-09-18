import { KpiCard } from "@/components/common/kpi-card";
import type { LootStatsResponseDtoOutputOverview } from "@lootlog/client/main";
import { Crown, Layers, Package, Sword } from "lucide-react";
import { useTranslation } from "react-i18next";

const numberFormatter = new Intl.NumberFormat("pl-PL");

const percentFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 1,
});

type LootOverviewCardsProps = {
  data?: LootStatsResponseDtoOutputOverview;
  isLoading?: boolean;
};

export const LootOverviewCards = ({
  data,
  isLoading = false,
}: LootOverviewCardsProps) => {
  const { t } = useTranslation();
  const totalLoots = data?.totalLoots ?? 0;
  const totalItems = data?.totalItems ?? 0;

  const itemShare = (count: number) =>
    t("loots.stats.overview.itemShare", {
      value: percentFormatter.format(totalItems > 0 ? count / totalItems : 0),
    });

  const kpis = [
    {
      key: "totalLoots",
      icon: Package,
      value: totalLoots,
      detail: t("loots.stats.overview.totalLootsDetail"),
    },
    {
      key: "totalItems",
      icon: Layers,
      value: totalItems,
      detail: t("loots.stats.overview.itemsPerLoot", {
        value: numberFormatter.format(
          totalLoots > 0 ? Math.round((totalItems / totalLoots) * 10) / 10 : 0,
        ),
      }),
    },
    {
      key: "legendaryItems",
      icon: Crown,
      value: data?.legendaryItems ?? 0,
      detail: itemShare(data?.legendaryItems ?? 0),
    },
    {
      key: "heroicItems",
      icon: Sword,
      value: data?.heroicItems ?? 0,
      detail: itemShare(data?.heroicItems ?? 0),
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.key}
          icon={kpi.icon}
          label={t(`loots.stats.overview.${kpi.key}`)}
          value={numberFormatter.format(kpi.value)}
          detail={kpi.detail}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};
