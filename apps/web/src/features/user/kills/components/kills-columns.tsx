import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@lootlog/ui/components/button";
import { ArrowUpDown, Crown, Medal, Trophy } from "lucide-react";
import { NpcTile } from "@/components/tiles/npc-tile";
import { NPC_TYPE_NAMES } from "@/constants/npc";
import i18n from "@/i18n/config";
import type { UserNpcKillsResponseDtoOutputNpcsItem } from "@lootlog/api-client/models/main/user-npc-kills-response-dto-output-npcs-item";

type NpcKill = UserNpcKillsResponseDtoOutputNpcsItem;

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

export const createKillsColumns = (startRank: number): ColumnDef<NpcKill>[] => [
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
    id: "icon",
    header: "",
    cell: ({ row }) =>
      row.original.npcIcon ? (
        <NpcTile
          npc={{
            id: row.original.npcId,
            name: row.original.npcName,
            lvl: row.original.npcLvl,
            icon: row.original.npcIcon,
          }}
        />
      ) : null,
    enableSorting: false,
  },
  {
    accessorKey: "npcName",
    header: i18n.t("kills.columns.name"),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.npcName}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "npcLvl",
    header: ({ column }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("kills.columns.level")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.npcLvl}
        {row.original.npcProf}
      </div>
    ),
  },
  {
    accessorKey: "npcType",
    header: () => (
      <div className="text-center">{i18n.t("kills.columns.type")}</div>
    ),
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground text-sm">
        {NPC_TYPE_NAMES[row.original.npcType as keyof typeof NPC_TYPE_NAMES] ??
          row.original.npcType}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "totalKills",
    header: ({ column }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("kills.columns.kills")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center font-semibold tabular-nums">
        {row.original.totalKills.toLocaleString()}
      </div>
    ),
  },
];
