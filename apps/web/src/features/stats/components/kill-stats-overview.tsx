import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { useTranslation } from "react-i18next";
import type { KillStatsOverview as KillStatsOverviewType } from "../hooks/use-guild-kill-stats";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type KillStatsOverviewProps = {
  data?: KillStatsOverviewType;
  isLoading?: boolean;
};

export const KillStatsOverview: React.FC<KillStatsOverviewProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const npcTypes = Object.entries(data.killsByType).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("kills.overview.totalKills")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalKills}</div>
        </CardContent>
      </Card>

      {npcTypes.slice(0, 3).map(([type, count]) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t(`npcType.${type}`)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
