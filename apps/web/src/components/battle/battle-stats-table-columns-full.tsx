import {
  SharedBattleData,
  SharedWarrior,
} from "@/components/battle/types/battle";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { pick } from "lodash";
import { ChevronDown, ChevronRight, Skull } from "lucide-react";

export const getBattleStatsTableColumns = (
  _battle: SharedBattleData,
  expandedRows: Map<string, "damage" | "legendary">,
  toggleDamageExpansion: (warriorId: string) => void,
  toggleLegendaryExpansion: (warriorId: string) => void
): ColumnDef<SharedWarrior>[] => [
  {
    accessorKey: "name",
    header: "Nick",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-1">
          <span className="font-semibold">{row.original.name}</span>
          {row.original.isDead && <Skull size={18} />}
        </div>
      );
    },
  },
  {
    accessorKey: "turns",
    header: "Tury",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.turns}</div>
    ),
  },
  {
    accessorKey: "damageDealt",
    header: "Obrażenia",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.damageDealt}</div>
    ),
  },
  {
    accessorKey: "damageDealtAfterDefensive",
    header: "Trafione obrażenia",
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.original.damageDealtAfterDefensive;

      return <div className="text-right tabular-nums">{value}</div>;
    },
  },
  {
    accessorKey: "damageDealtAfterDefensivePercentage",
    header: "Skuteczność",
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.original.damageDealtAfterDefensivePercentage;

      return <div className="text-right tabular-nums">{value}%</div>;
    },
  },
  {
    accessorKey: "damageTaken",
    header: "Otrzymane obrażenia",
    enableSorting: true,
    cell: ({ row }) => {
      const warrior = row.original;
      const isExpanded = expandedRows.get(warrior.id) === "damage";
      return (
        <div className="flex justify-end">
          <Button
            onClick={() => toggleDamageExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-2 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              }
            )}
            variant="secondary"
            size="sm"
          >
            <span className="tabular-nums">{warrior.damageTaken}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: "evasions",
    header: "Uniki",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.evasions}</div>
    ),
  },
  {
    accessorKey: "blocks",
    header: "Bloki",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.blocks}</div>
    ),
  },
  {
    accessorKey: "criticalHits",
    header: "Krytyki",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.criticalHits}</div>
    ),
  },
  {
    accessorKey: "legendaryBonuses",
    header: "Bonusy",
    enableSorting: true,
    cell: ({ row }) => {
      const warrior = row.original;
      const value = warrior.legendaryBonuses;
      const pickedValues = pick(value, [
        "holytouch",
        "curse",
        "facade",
        "critred",
        "verycrit",
        "lastheal",
        "glare",
      ]);
      const sum = Object.values(pickedValues).reduce((a, b) => a + b, 0);
      const isExpanded = expandedRows.get(warrior.id) === "legendary";

      return (
        <div className="flex justify-end">
          <Button
            onClick={() => toggleLegendaryExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-2 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              }
            )}
            variant="secondary"
            size="sm"
          >
            <span className="tabular-nums">{sum}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
  },
];
