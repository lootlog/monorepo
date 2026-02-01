import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Badge } from "@lootlog/ui/components/badge";
import { useTranslation } from "react-i18next";
import { usePlayerKillStats } from "../hooks/use-player-kill-stats";
import { Swords } from "lucide-react";

const NPC_TYPE_ORDER = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
] as const;

export const PlayerKillStatsCard: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = usePlayerKillStats();

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
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.overview.totalKills === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            {t("kills.playerStats.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("kills.playerStats.noData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeNpcTypes = NPC_TYPE_ORDER.filter(
    (type) => (data.overview.killsByType[type] ?? 0) > 0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          {t("kills.playerStats.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-bold">{data.overview.totalKills}</div>
          <p className="text-sm text-muted-foreground">
            {t("kills.overview.totalKills")}
          </p>
        </div>

        {activeNpcTypes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("kills.overview.killsByType")}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeNpcTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {t(`npcType.${type}`)}: {data.overview.killsByType[type]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {Object.keys(data.overview.killsByWorld).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("kills.playerStats.killsByWorld")}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.overview.killsByWorld)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([world, count]) => (
                  <Badge key={world} variant="outline">
                    {world}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
