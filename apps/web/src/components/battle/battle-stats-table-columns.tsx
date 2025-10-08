import { cn } from "@lootlog/ui/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { pick } from "lodash";
import { User, ChevronDown, ChevronRight, Skull } from "lucide-react";
import type { SharedBattleData, SharedWarrior } from "./types/battle";
import { Button } from "@lootlog/ui/components/button";

export const getBattleStatsColumns = (
  battle: SharedBattleData,
  expandedRows: Map<string, "damage" | "legendary">,
  toggleDamageExpansion: (warriorId: string) => void,
  toggleLegendaryExpansion: (warriorId: string) => void,
  labels?: {
    nick: string;
    turns: string;
    damage: string;
    effectiveDamage: string;
    effectiveness: string;
    damageTaken: string;
    evasions: string;
    blocks: string;
    criticals: string;
    bonuses: string;
  }
): ColumnDef<SharedWarrior>[] => {
  const defaultLabels = {
    nick: "Nick",
    turns: "Turns",
    damage: "DMG",
    effectiveDamage: "DMG Hit",
    effectiveness: "Eff.",
    damageTaken: "DMG Rec.",
    evasions: "Evasions",
    blocks: "Blocks",
    criticals: "Criticals",
    bonuses: "Bonuses",
  };

  const l = { ...defaultLabels, ...labels };

  return [
    {
      accessorKey: "name",
      header: l.nick,
      cell: ({ row }) => {
        const isCurrentUser = row.original.originalId === battle.characterId;
        return (
          <div className="flex items-center gap-1">
            {isCurrentUser && <User size={18} className="text-white" />}
            <span className="font-semibold">{row.original.name}</span>
            {row.original.isDead && <Skull size={18} />}
          </div>
        );
      },
    },
    {
      accessorKey: "turns",
      header: l.turns,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{row.original.turns}</div>
      ),
    },
    {
      accessorKey: "damageDealt",
      header: l.damage,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.damageDealt}
        </div>
      ),
    },
    {
      accessorKey: "damageDealtAfterDefensive",
      header: l.effectiveDamage,
      enableSorting: true,
      cell: ({ row }) => {
        const value = row.original.damageDealtAfterDefensive;
        return <div className="text-right tabular-nums">{value}</div>;
      },
    },
    {
      accessorKey: "damageDealtAfterDefensivePercentage",
      header: l.effectiveness,
      enableSorting: true,
      cell: ({ row }) => {
        const value = row.original.damageDealtAfterDefensivePercentage;
        return <div className="text-right tabular-nums">{value}%</div>;
      },
    },
    {
      accessorKey: "damageTaken",
      header: l.damageTaken,
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
      header: l.evasions,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{row.original.evasions}</div>
      ),
    },
    {
      accessorKey: "blocks",
      header: l.blocks,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{row.original.blocks}</div>
      ),
    },
    {
      accessorKey: "criticalHits",
      header: l.criticals,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.criticalHits}
        </div>
      ),
    },
    {
      accessorKey: "legendaryBonuses",
      header: l.bonuses,
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
};
