import { Card, CardContent } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { Flame, Mountain, Shield, Sword } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { KillStatsOverview as KillStatsOverviewType, NpcType } from "../hooks/use-guild-kill-stats";

const NPC_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  TITAN: {
    icon: <Mountain className="h-5 w-5" />,
    gradient: "from-red-500/10 to-orange-500/5",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  COLOSSUS: {
    icon: <Flame className="h-5 w-5" />,
    gradient: "from-purple-500/10 to-pink-500/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  HERO: {
    icon: <Shield className="h-5 w-5" />,
    gradient: "from-amber-500/10 to-yellow-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  ELITE2: {
    icon: <Sword className="h-5 w-5" />,
    gradient: "from-blue-500/10 to-cyan-500/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
};

const NPC_TYPES_TO_DISPLAY: NpcType[] = ["TITAN", "COLOSSUS", "HERO", "ELITE2"];

type NpcTypeStatsCardsProps = {
  data?: KillStatsOverviewType;
  isLoading?: boolean;
};

export const NpcTypeStatsCards: React.FC<NpcTypeStatsCardsProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {NPC_TYPES_TO_DISPLAY.map((type) => (
          <Card key={type}>
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {NPC_TYPES_TO_DISPLAY.map((type) => {
        const config = NPC_TYPE_CONFIG[type];
        return (
          <Card
            key={type}
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
                    {t(`npcType.${type}`)}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(data?.killsByType[type] ?? 0).toLocaleString()}
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
