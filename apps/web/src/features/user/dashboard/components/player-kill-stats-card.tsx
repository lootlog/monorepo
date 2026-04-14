import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { useDashboardKillStats } from "../hooks/use-dashboard-kill-stats";
import { Globe, Swords, Target } from "lucide-react";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

const NPC_TYPE_ORDER = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
] as const;

type PlayerKillStatsCardProps = {
  world?: string;
};

export const PlayerKillStatsCard: React.FC<PlayerKillStatsCardProps> = ({
  world,
}) => {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardKillStats({ world });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.overview.totalKills === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            {t("kills.playerStats.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            {t("kills.playerStats.noData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeNpcTypes = NPC_TYPE_ORDER.filter(
    (type) => (data.overview.killsByType[type] ?? 0) > 0,
  );

  const worldEntries = Object.entries(data.overview.killsByWorld)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          {t("kills.playerStats.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight">
              {data.overview.totalKills.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("kills.overview.totalKills")}
            </p>
          </div>
        </div>

        {activeNpcTypes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("kills.overview.killsByType")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {activeNpcTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <span className="text-sm">{t(`npcType.${type}`)}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {data.overview.killsByType[type]?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {worldEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("kills.playerStats.killsByWorld")}
            </p>
            <div className="space-y-1">
              {worldEntries.map(([worldName, count]) => (
                <div
                  key={worldName}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {capitalizeFirstLetter(worldName)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
