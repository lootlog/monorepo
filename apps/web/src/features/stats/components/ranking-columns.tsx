import type { ColumnDef } from "@tanstack/react-table";
import type { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { ArrowUpDown, Crown, Medal, Trophy } from "lucide-react";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { MemberKillRanking, NpcType } from "../hooks/use-guild-kill-stats";

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Trophy className="h-4 w-4 text-slate-400" />;
    case 3:
      return <Medal className="h-4 w-4 text-amber-600" />;
    default:
      return null;
  }
};

const NPC_TYPE_ORDER: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

export const createRankingColumns = (
  startRank: number,
  activeNpcTypes: NpcType[],
  t: ReturnType<typeof useTranslation>["t"],
): ColumnDef<MemberKillRanking>[] => {
  const baseColumns: ColumnDef<MemberKillRanking>[] = [
    {
      id: "rank",
      header: () => <div className="text-center w-8">#</div>,
      cell: ({ row }) => {
        const rank = startRank + row.index + 1;
        const icon = getRankIcon(rank);
        return (
          <div className="flex items-center justify-center w-8">
            {icon ?? (
              <span className="text-sm font-medium text-muted-foreground">
                {rank}
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "memberName",
      header: t("kills.memberRanking.member"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={getDiscordAvatarUrl(
                row.original.memberUserId,
                row.original.memberAvatar,
                32,
              )}
            />
            <AvatarFallback className="text-xs">
              {row.original.memberName[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.memberName}</span>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "totalParticipations",
      header: ({ column }) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            {t("kills.memberRanking.totalKills")}
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-semibold tabular-nums">
          {row.original.totalParticipations.toLocaleString()}
        </div>
      ),
    },
  ];

  const typeColumns: ColumnDef<MemberKillRanking>[] = activeNpcTypes
    .filter((type) => NPC_TYPE_ORDER.includes(type))
    .sort((a, b) => NPC_TYPE_ORDER.indexOf(a) - NPC_TYPE_ORDER.indexOf(b))
    .map((type) => ({
      id: `kills_${type}`,
      accessorFn: (row: MemberKillRanking) =>
        row.participationsByType[type] ?? 0,
      header: () => <div className="text-center">{t(`npcType.${type}`)}</div>,
      cell: ({ row }: { row: { original: MemberKillRanking } }) => (
        <div className="text-center tabular-nums">
          {(row.original.participationsByType[type] ?? 0).toLocaleString()}
        </div>
      ),
      enableSorting: false,
    }));

  return [...baseColumns, ...typeColumns];
};
