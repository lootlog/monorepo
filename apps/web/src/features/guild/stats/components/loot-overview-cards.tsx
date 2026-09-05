import { StatsOverviewCard } from "./stats-overview-card";
import { useTranslation } from "react-i18next";
import { Package, Layers, Crown, Sword } from "lucide-react";
import type { LootStatsResponseDtoOutputOverview } from "@lootlog/client/main";

const OVERVIEW_CONFIG = {
  totalLoots: {
    icon: <Package className="h-5 w-5" />,
    gradient: "bg-emerald-500/8",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    key: "totalLoots" as const,
  },
  totalItems: {
    icon: <Layers className="h-5 w-5" />,
    gradient: "bg-cyan-500/8",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    key: "totalItems" as const,
  },
  legendaryItems: {
    icon: <Crown className="h-5 w-5" />,
    gradient: "bg-red-500/8",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    key: "legendaryItems" as const,
  },
  heroicItems: {
    icon: <Sword className="h-5 w-5" />,
    gradient: "bg-blue-500/8",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    key: "heroicItems" as const,
  },
};

const OVERVIEW_KEYS = [
  "totalLoots",
  "totalItems",
  "legendaryItems",
  "heroicItems",
] as const;

type LootOverviewCardsProps = {
  data?: LootStatsResponseDtoOutputOverview;
  isLoading?: boolean;
};

export const LootOverviewCards: React.FC<LootOverviewCardsProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {OVERVIEW_KEYS.map((key) => (
          <StatsOverviewCard key={key} loading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {OVERVIEW_KEYS.map((key) => {
        const config = OVERVIEW_CONFIG[key];
        const value = data?.[config.key] ?? 0;

        return (
          <StatsOverviewCard
            key={key}
            icon={config.icon}
            iconBg={config.iconBg}
            iconColor={config.iconColor}
            className={config.gradient}
            label={t(`loots.stats.overview.${key}`)}
            value={value}
          />
        );
      })}
    </div>
  );
};
