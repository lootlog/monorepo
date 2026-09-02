import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@lootlog/ui/components/button";
import { ArrowUpDown } from "lucide-react";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import { NpcTile } from "@/components/tiles/npc-tile";
import { NPC_TYPE_NAMES } from "@/constants/npc";
import i18n from "@/i18n/config";
import type { UserNpcKillsResponseDtoOutputNpcsItem } from "@lootlog/client/main";

type NpcKill = UserNpcKillsResponseDtoOutputNpcsItem;

export const createKillsColumns = (startRank: number): ColumnDef<NpcKill>[] => [
  {
    id: "rank",
    header: () => <div className="text-center w-8">#</div>,
    cell: ({ row }) => {
      const rank = startRank + row.index + 1;
      return (
        <div className="flex items-center justify-center w-8">
          <PodiumRankIcon
            rank={rank}
            fallback={
              <span className="text-sm font-medium text-muted-foreground">
                {rank}
              </span>
            }
          />
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
