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
import { useTranslation } from "react-i18next";
import type { MemberKillRanking, NpcType } from "../hooks/use-guild-kill-stats";
import { Badge } from "@lootlog/ui/components/badge";

const NPC_TYPE_ORDER: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

type KillStatsMemberTableProps = {
  data?: MemberKillRanking[];
  isLoading?: boolean;
};

export const KillStatsMemberTable: React.FC<KillStatsMemberTableProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("kills.memberRanking.title")}</CardTitle>
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
          <CardTitle>{t("kills.memberRanking.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("kills.memberRanking.noData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeNpcTypes = NPC_TYPE_ORDER.filter((type) =>
    data.some((member) => (member.killsByType[type] ?? 0) > 0),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("kills.memberRanking.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                {t("kills.memberRanking.position")}
              </TableHead>
              <TableHead>{t("kills.memberRanking.member")}</TableHead>
              <TableHead className="text-right">
                {t("kills.memberRanking.totalKills")}
              </TableHead>
              {activeNpcTypes.map((type) => (
                <TableHead key={type} className="text-right">
                  {t(`npcType.${type}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((member, index) => (
              <TableRow key={member.memberId}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{member.memberName}</TableCell>
                <TableCell className="text-right font-semibold">
                  {member.totalKills}
                </TableCell>
                {activeNpcTypes.map((type) => (
                  <TableCell key={type} className="text-right">
                    {member.killsByType[type] ?? 0}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
