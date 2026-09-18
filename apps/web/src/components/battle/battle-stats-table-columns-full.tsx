import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { cn } from "cn";
import type { ColumnDef } from "@tanstack/react-table";
import { Flag, Skull } from "lucide-react";
import { EmergencyExitIcon } from "@lootlog/ui/components/emergency-exit-icon";
import type { TFunction } from "i18next";
import type { sortedTableFeatures } from "@/lib/tanstack-table-features";
import { BattleStatsExpandButton } from "./battle-stats-expand-button";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

export type BattleStatsExpansionType =
  | "damage"
  | "legendary"
  | "turns"
  | "blocks"
  | "details"
  | "damageDealt";

type BattleStatsExpandableKey =
  | "turns"
  | "damageDealt"
  | "damageTaken"
  | "blocks"
  | "legbons";

type BattleStatsColumn = ColumnDef<typeof sortedTableFeatures, Warrior>;

const formatNumber = (value: number) => value.toLocaleString("pl-PL");

export const getBattleStatsTableColumns = ({
  characterId,
  expandedRows,
  onToggleExpansion,
  rankingMaxima,
  t,
  userTeam,
}: {
  characterId: string;
  /** Columns listed here draw a meter bar scaled to the battle's highest value. */
  rankingMaxima: Partial<Record<BattleStatsExpandableKey, number>>;
  userTeam: number | undefined;
  expandedRows: Map<string, BattleStatsExpansionType>;
  onToggleExpansion: (
    warriorId: string,
    expansionType: BattleStatsExpansionType,
  ) => void;
  t: TFunction;
}): BattleStatsColumn[] => {
  const expandableColumn = (
    accessorKey: BattleStatsExpandableKey,
    header: string,
    expansionType: BattleStatsExpansionType,
  ): BattleStatsColumn => ({
    accessorKey,
    header,
    enableSorting: true,
    cell: ({ row }) => {
      const rankingMax = rankingMaxima[accessorKey];

      return (
        <div className="relative flex justify-end">
          {rankingMax ? (
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0.5 right-0 rounded-sm",
                row.original.team === userTeam
                  ? "bg-green-400/20"
                  : "bg-red-400/20",
              )}
              style={{
                width: `${(row.original[accessorKey] / rankingMax) * 100}%`,
              }}
            />
          ) : null}
          <BattleStatsExpandButton
            className="relative"
            dense
            expanded={expandedRows.get(row.original.id) === expansionType}
            onToggle={() => onToggleExpansion(row.original.id, expansionType)}
          >
            {formatNumber(row.original[accessorKey])}
          </BattleStatsExpandButton>
        </div>
      );
    },
  });

  const numericColumn = (
    accessorKey:
      | "damageDealtAfterDefensive"
      | "damageDealtAfterDefensivePercentage"
      | "evasions"
      | "criticalHits",
    header: string,
    suffix = "",
  ): BattleStatsColumn => ({
    accessorKey,
    header,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="pr-1 text-right tabular-nums">
        {formatNumber(row.original[accessorKey])}
        {suffix}
      </div>
    ),
  });

  return [
    {
      accessorKey: "name",
      header: t("battleUi.statsTable.columns.nick"),
      cell: ({ row }) => {
        const warrior = row.original;

        return (
          <BattleStatsExpandButton
            className="h-auto max-w-full justify-start py-1 text-left"
            expanded={expandedRows.get(warrior.id) === "details"}
            onToggle={() => onToggleExpansion(warrior.id, "details")}
          >
            <span className="min-w-0">
              <span
                className={cn(
                  "flex items-center gap-1 font-semibold",
                  warrior.originalId === characterId &&
                    BATTLE_TEXT_COLORS.team.friendly,
                )}
              >
                <span className="truncate">{warrior.name}</span>
                {warrior.isDead && <Skull className="size-3.5 shrink-0" />}
                {warrior.surrendered && <Flag className="size-3.5 shrink-0" />}
                {warrior.fled && (
                  <EmergencyExitIcon size={14} className="shrink-0" />
                )}
              </span>
              <span className="block text-[11px] font-normal text-muted-foreground">
                {warrior.lvl}
                {warrior.prof}
              </span>
            </span>
          </BattleStatsExpandButton>
        );
      },
    },
    expandableColumn("turns", t("battleUi.statsTable.columns.turns"), "turns"),
    expandableColumn(
      "damageDealt",
      t("battleUi.statsTable.columns.damage"),
      "damageDealt",
    ),
    numericColumn(
      "damageDealtAfterDefensive",
      t("battleUi.statsTable.columns.hitDamage"),
    ),
    numericColumn(
      "damageDealtAfterDefensivePercentage",
      t("battleUi.statsTable.columns.effectiveness"),
      "%",
    ),
    expandableColumn(
      "damageTaken",
      t("battleUi.statsTable.columns.damageTaken"),
      "damage",
    ),
    numericColumn("evasions", t("battleUi.statsTable.columns.evasions")),
    expandableColumn(
      "blocks",
      t("battleUi.statsTable.columns.blocks"),
      "blocks",
    ),
    numericColumn(
      "criticalHits",
      t("battleUi.statsTable.columns.criticalHits"),
    ),
    expandableColumn(
      "legbons",
      t("battleUi.statsTable.columns.legendaryBonuses"),
      "legendary",
    ),
  ];
};
