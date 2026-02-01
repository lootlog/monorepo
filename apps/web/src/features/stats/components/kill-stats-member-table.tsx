import { Link } from "@tanstack/react-router";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";
import { ChevronRight, Crown, Medal, Trophy, Users } from "lucide-react";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { MemberKillRanking, NpcType } from "../hooks/use-guild-kill-stats";

const NPC_TYPE_ORDER: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

const RankIcon: React.FC<{ position: number }> = ({ position }) => {
  if (position === 1) {
    return <Crown className="h-4 w-4 text-yellow-500" />;
  }
  if (position === 2) {
    return <Trophy className="h-4 w-4 text-slate-400" />;
  }
  if (position === 3) {
    return <Medal className="h-4 w-4 text-amber-600" />;
  }
  return (
    <span className="text-sm text-muted-foreground tabular-nums">
      {position}
    </span>
  );
};

type KillStatsMemberTableProps = {
  data?: MemberKillRanking[];
  isLoading?: boolean;
  showViewAll?: boolean;
  guildId?: string;
};

export const KillStatsMemberTable: React.FC<KillStatsMemberTableProps> = ({
  data,
  isLoading,
  showViewAll = false,
  guildId,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("kills.memberRanking.title")}
          </CardTitle>
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
    data.some((member) => (member.participationsByType[type] ?? 0) > 0),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("kills.memberRanking.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center sticky top-0 bg-card">
                  #
                </TableHead>
                <TableHead className="sticky top-0 bg-card">
                  {t("kills.memberRanking.member")}
                </TableHead>
                <TableHead className="text-right sticky top-0 bg-card">
                  {t("kills.memberRanking.totalKills")}
                </TableHead>
                {activeNpcTypes.map((type) => (
                  <TableHead
                    key={type}
                    className="text-right sticky top-0 bg-card"
                  >
                    {t(`npcType.${type}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((member, index) => (
                <TableRow
                  key={member.memberId}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <RankIcon position={index + 1} />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={getDiscordAvatarUrl(
                            member.memberUserId,
                            member.memberAvatar,
                            32,
                          )}
                        />
                        <AvatarFallback className="text-xs">
                          {member.memberName[0]}
                        </AvatarFallback>
                      </Avatar>
                      {member.memberName}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {member.totalParticipations.toLocaleString()}
                  </TableCell>
                  {activeNpcTypes.map((type) => (
                    <TableCell key={type} className="text-right tabular-nums">
                      {(
                        member.participationsByType[type] ?? 0
                      ).toLocaleString()}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      {showViewAll && guildId && (
        <CardFooter className="justify-center border-t pt-4">
          <Link to="/$guildId/stats/ranking" params={{ guildId }}>
            <Button variant="ghost" size="sm">
              {t("kills.memberRanking.viewAll")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};
