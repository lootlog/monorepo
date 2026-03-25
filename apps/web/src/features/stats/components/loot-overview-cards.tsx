import { Card, CardContent } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { Package, Layers, Crown, Sword } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { LootStatsOverview } from "../hooks/use-loot-stats";

const OVERVIEW_CONFIG = {
  totalLoots: {
    icon: <Package className="h-5 w-5" />,
    gradient: "from-emerald-500/10 to-green-500/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    key: "totalLoots" as const,
  },
  totalItems: {
    icon: <Layers className="h-5 w-5" />,
    gradient: "from-violet-500/10 to-purple-500/5",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    key: "totalItems" as const,
  },
  legendaryItems: {
    icon: <Crown className="h-5 w-5" />,
    gradient: "from-red-500/10 to-rose-500/5",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    key: "legendaryItems" as const,
  },
  heroicItems: {
    icon: <Sword className="h-5 w-5" />,
    gradient: "from-blue-500/10 to-cyan-500/5",
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
  data?: LootStatsOverview;
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
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
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
          <Card
            key={key}
            className={cn("bg-gradient-to-br border-0", config.gradient)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-lg",
                    config.iconBg,
                    config.iconColor,
                  )}
                >
                  {config.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {t(`loots.stats.overview.${key}`)}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {value.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
