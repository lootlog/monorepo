import { TableCell } from "@lootlog/ui/components/table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "cn";
import type { Battle } from "@/lib/api/battlelog-types";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { BattleStatValue } from "@/types/stats-customization.types";
import { OneVsOneStatValueCell } from "./one-vs-one-stat-value-cell";
import type { OneVsOneStatsRow } from "./one-vs-one-stats-rows";
import { BATTLE_SURFACE_COLORS } from "./utils/battle-color-palette";
import { formatNumber } from "@/components/battle/utils/value-utils";

type BattleWarrior = Battle["warriors"][number];

type OneVsOneStatsColumn = ColumnDef<
  typeof coreTableFeatures,
  OneVsOneStatsRow
>;

const ONE_VS_ONE_STATS_COLUMN_IDS = {
  stat: "stat",
  user: "user",
  opponent: "opponent",
} as const;

export const getOneVsOneStatsHeadClassName = ({
  columnId,
  compact,
  topClassName,
}: {
  columnId: string;
  compact: boolean | undefined;
  /** Sticky offset of the column header, which depends on where the table scrolls. */
  topClassName: string;
}) =>
  columnId === ONE_VS_ONE_STATS_COLUMN_IDS.stat
    ? cn(
        "sticky left-0 z-20 border-r border-b border-border/70 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
        topClassName,
        compact && "h-8 px-2",
      )
    : cn(
        "sticky z-10 border-b border-border/70 text-center whitespace-wrap px-2",
        topClassName,
        columnId === ONE_VS_ONE_STATS_COLUMN_IDS.user
          ? BATTLE_SURFACE_COLORS.team.friendlyHeader
          : BATTLE_SURFACE_COLORS.team.enemyHeader,
        compact && "h-8 px-1.5",
      );

const formatValue = (
  value: BattleStatValue,
  formatter?: (value: BattleStatValue) => string,
  booleanLabels?: { yes: string; no: string },
): string => {
  if (formatter) {
    return formatter(value);
  }

  if (Number.isFinite(value)) {
    return formatNumber(Number(value));
  }

  if (value === true || value === false) {
    return value
      ? (booleanLabels?.yes ?? "true")
      : (booleanLabels?.no ?? "false");
  }

  return String(value ?? 0);
};

/**
 * Every cell renders its own `<td>`: a category row and a stat row style the same column
 * differently, and the value cell owns its comparison bar.
 */
export const getOneVsOneStatsColumns = ({
  booleanLabels,
  compact,
  opponent,
  statHeader,
  user,
}: {
  booleanLabels: { yes: string; no: string };
  compact: boolean | undefined;
  opponent: BattleWarrior | undefined;
  statHeader: string;
  user: BattleWarrior | undefined;
}): OneVsOneStatsColumn[] => {
  // Every value cell compares both warriors; without one the table shows its empty state.
  if (!user || !opponent) return [];

  const valueColumn = (
    id: string,
    side: "friendly" | "enemy",
    warrior: BattleWarrior,
    opposingWarrior: BattleWarrior,
  ): OneVsOneStatsColumn => ({
    id,
    header: () => warrior.name,
    cell: ({ row: { original: row } }) => {
      if (row.kind === "category") {
        return (
          <TableCell
            className={cn("bg-muted/50", compact && "h-auto px-1.5 py-1.5")}
          />
        );
      }

      const value = warrior[row.stat.key];

      return (
        <OneVsOneStatValueCell
          compact={compact}
          label={formatValue(value, row.stat.format, booleanLabels)}
          opposingValue={opposingWarrior[row.stat.key]}
          side={side}
          value={value}
        />
      );
    },
  });

  return [
    {
      id: ONE_VS_ONE_STATS_COLUMN_IDS.stat,
      header: () => statHeader,
      cell: ({ row: { original: row } }) => {
        if (row.kind === "category") {
          return (
            <TableCell
              className={cn(
                "sticky left-0 z-10 border-r border-border/70 bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))] font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                compact ? "h-auto px-2 py-1.5" : "py-1",
              )}
            >
              {row.label}
            </TableCell>
          );
        }

        return (
          <TableCell
            className={cn(
              "sticky left-0 z-10 border-r border-border/70 bg-background font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] hover:bg-background",
              compact ? "h-auto px-2 py-1.5 leading-[1.35]" : "py-2",
              row.stat.color,
            )}
            style={{
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
            }}
          >
            {row.stat.label}
          </TableCell>
        );
      },
    },
    valueColumn(ONE_VS_ONE_STATS_COLUMN_IDS.user, "friendly", user, opponent),
    valueColumn(ONE_VS_ONE_STATS_COLUMN_IDS.opponent, "enemy", opponent, user),
  ];
};
