import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Flag, Skull } from "lucide-react";
import { EmergencyExitIcon } from "@lootlog/ui/components/emergency-exit-icon";
import type { TFunction } from "i18next";

export const getBattleStatsTableColumns = (
  t: TFunction,
  expandedRows: Map<
    string,
    "damage" | "legendary" | "turns" | "blocks" | "details" | "damageDealt"
  >,
  toggleDamageExpansion: (warriorId: string) => void,
  toggleLegendaryExpansion: (warriorId: string) => void,
  toggleTurnsExpansion: (warriorId: string) => void,
  toggleBlocksExpansion: (warriorId: string) => void,
  toggleDetailsExpansion: (warriorId: string) => void,
  toggleDamageDealtExpansion: (warriorId: string) => void,
): ColumnDef<Warrior>[] => [
  {
    accessorKey: "name",
    header: t("battleUi.statsTable.columns.nick"),
    cell: ({ row }) => {
      const warrior = row.original;
      const isExpanded = expandedRows.get(warrior.id) === "details";
      return (
        <div className="flex items-center gap-1">
          <Button
            onClick={() => toggleDetailsExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-1 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              },
            )}
            variant="secondary"
            size="sm"
          >
            <span className="font-semibold">{warrior.name}</span>
            {warrior.isDead && <Skull size={18} />}
            {warrior.surrendered && <Flag size={18} />}
            {warrior.fled && <EmergencyExitIcon size={18} />}
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
    accessorKey: "turns",
    header: t("battleUi.statsTable.columns.turns"),
    enableSorting: true,
    cell: ({ row }) => {
      const warrior = row.original;
      const isExpanded = expandedRows.get(warrior.id) === "turns";
      return (
        <div className="flex justify-end">
          <Button
            onClick={() => toggleTurnsExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-2 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              },
            )}
            variant="secondary"
            size="sm"
          >
            <span className="tabular-nums">{warrior.turns}</span>
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
    accessorKey: "damageDealt",
    header: t("battleUi.statsTable.columns.damage"),
    enableSorting: true,
    cell: ({ row }) => {
      const warrior = row.original;
      const isExpanded = expandedRows.get(warrior.id) === "damageDealt";
      return (
        <div className="flex justify-end">
          <Button
            onClick={() => toggleDamageDealtExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-2 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              },
            )}
            variant="secondary"
            size="sm"
          >
            <span className="tabular-nums">{warrior.damageDealt}</span>
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
    accessorKey: "damageDealtAfterDefensive",
    header: t("battleUi.statsTable.columns.hitDamage"),
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.original.damageDealtAfterDefensive;

      return <div className="text-right tabular-nums">{value}</div>;
    },
  },
  {
    accessorKey: "damageDealtAfterDefensivePercentage",
    header: t("battleUi.statsTable.columns.effectiveness"),
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.original.damageDealtAfterDefensivePercentage;

      return <div className="text-right tabular-nums">{value}%</div>;
    },
  },
  {
    accessorKey: "damageTaken",
    header: t("battleUi.statsTable.columns.damageTaken"),
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
              },
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
    header: t("battleUi.statsTable.columns.evasions"),
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.evasions}</div>
    ),
  },
  {
    accessorKey: "blocks",
    header: t("battleUi.statsTable.columns.blocks"),
    enableSorting: true,
    cell: ({ row }) => {
      const warrior = row.original;
      const isExpanded = expandedRows.get(warrior.id) === "blocks";
      return (
        <div className="flex justify-end">
          <Button
            onClick={() => toggleBlocksExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-2 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              },
            )}
            variant="secondary"
            size="sm"
          >
            <span className="tabular-nums">{warrior.blocks}</span>
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
    accessorKey: "criticalHits",
    header: t("battleUi.statsTable.columns.criticalHits"),
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.criticalHits}</div>
    ),
  },
  {
    accessorKey: "legbons",
    header: t("battleUi.statsTable.columns.legendaryBonuses"),
    enableSorting: true,
    cell: ({ row }) => {
      const warrior = row.original;
      const value = warrior.legbons;
      const isExpanded = expandedRows.get(warrior.id) === "legendary";

      return (
        <div className="flex justify-end">
          <Button
            onClick={() => toggleLegendaryExpansion(warrior.id)}
            className={cn(
              "flex items-center gap-2 bg-transparent p-1 rounded transition-colors",
              {
                "bg-secondary": isExpanded,
              },
            )}
            variant="secondary"
            size="sm"
          >
            <span className="tabular-nums">{value}</span>
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
