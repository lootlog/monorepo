import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Badge } from "@lootlog/ui/components/badge";
import { useTranslation } from "react-i18next";
import type { RecentKill } from "../hooks/use-guild-kill-stats";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

type KillStatsRecentKillsProps = {
  data?: RecentKill[];
  isLoading?: boolean;
};

export const KillStatsRecentKills: React.FC<KillStatsRecentKillsProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("kills.recentKills.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("kills.recentKills.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("kills.recentKills.noData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("kills.recentKills.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("kills.recentKills.npc")}</TableHead>
              <TableHead className="text-center">
                {t("kills.recentKills.level")}
              </TableHead>
              <TableHead>{t("kills.recentKills.type")}</TableHead>
              <TableHead>{t("kills.recentKills.participants")}</TableHead>
              <TableHead className="text-right">
                {t("kills.recentKills.killedAt")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((kill) => (
              <TableRow key={kill.killId}>
                <TableCell className="font-medium">{kill.npcName}</TableCell>
                <TableCell className="text-center">{kill.npcLvl}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {t(`npcType.${kill.npcType}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {kill.participants.slice(0, 3).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {p.characterName}
                      </Badge>
                    ))}
                    {kill.participants.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{kill.participants.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(kill.killedAt), {
                    addSuffix: true,
                    locale: pl,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
