import { formatLevel } from "@lootlog/domain/profession";
import type { ColumnDef } from "@tanstack/react-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { RankBadge } from "@/components/common/rank-badge";
import { NpcTile } from "@/components/tiles/npc-tile";
import i18n from "@/i18n/config";
import type { UserNpcKillsResponseDtoOutputNpcsItem } from "@lootlog/client/main";
import type { sortingTableFeatures } from "@/lib/tanstack-table-features";

type NpcKill = UserNpcKillsResponseDtoOutputNpcsItem;

export const createKillsColumns = (
  startRank: number,
): ColumnDef<typeof sortingTableFeatures, NpcKill>[] => [
  {
    id: "rank",
    header: () => <div className="text-center w-8">#</div>,
    cell: ({ row }) => {
      const rank = startRank + row.index + 1;

      return (
        <div className="flex items-center justify-center w-8">
          <RankBadge rank={rank} />
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
      <SortableColumnHeader column={column}>
        {i18n.t("kills.columns.level")}
      </SortableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {formatLevel(row.original.npcLvl, row.original.npcProf)}
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
        {i18n.t(`npcType.${row.original.npcType}`, {
          defaultValue: row.original.npcType,
        })}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "totalKills",
    header: ({ column }) => (
      <SortableColumnHeader column={column}>
        {i18n.t("kills.columns.kills")}
      </SortableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center font-semibold tabular-nums">
        {row.original.totalKills.toLocaleString("pl-PL")}
      </div>
    ),
  },
];
