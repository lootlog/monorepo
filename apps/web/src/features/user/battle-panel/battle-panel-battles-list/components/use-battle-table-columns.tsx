import type { useBattleTableSelection } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-selection";
import {
  getBattleResult,
  getBattleTeams,
} from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";
import type { Battle } from "@/lib/api/battlelog-types";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "cn";
import { format } from "date-fns";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { stopBattleTableAction } from "./battle-table-events";
import { BattleTableInfoBadges } from "./battle-table-info-badges";
import { BattleTableTeamCell } from "./battle-table-team-cell";

type ColumnsProps = Pick<
  ReturnType<typeof useBattleTableSelection>,
  | "headerCheckboxState"
  | "handleHeaderSelectionChange"
  | "selectedBattleIds"
  | "handleSelectionChange"
> & {
  onMatchmakingClick?: () => void;
  onPhClick?: () => void;
  onWorldClick?: (world: string) => void;
  renderBattleActions: (battle: Battle) => ReactNode;
};
const renderBattleStatus = (battle: Battle) => {
  const result = getBattleResult(battle);

  return (
    <div className="mx-auto flex w-6 items-center justify-center">
      <BattleResultStatus result={result} />
    </div>
  );
};
export function useBattleTableColumns({
  headerCheckboxState,
  handleHeaderSelectionChange,
  selectedBattleIds,
  handleSelectionChange,
  onMatchmakingClick,
  onPhClick,
  onWorldClick,
  renderBattleActions,
}: ColumnsProps) {
  const { t } = useTranslation();
  const selectionId = useId();
  const columns: ColumnDef<typeof coreTableFeatures, Battle>[] = [
    {
      id: "select",
      header: () => (
        <div
          data-battle-table-action
          className="absolute inset-0 flex cursor-pointer items-center justify-center transition-colors hover:bg-primary/10"
        >
          <label
            htmlFor={`${selectionId}-all`}
            className="absolute inset-0 cursor-pointer"
          >
            <span className="sr-only">{t("battlePanel.bulk.selectRows")}</span>
          </label>
          <Checkbox
            id={`${selectionId}-all`}
            checked={headerCheckboxState === true}
            indeterminate={headerCheckboxState === "indeterminate"}
            aria-label={t("battlePanel.bulk.selectRows")}
            className="relative size-5"
            onClick={stopBattleTableAction}
            onCheckedChange={(checked) =>
              handleHeaderSelectionChange(checked === true)
            }
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          data-battle-table-action
          className={cn(
            "absolute inset-0 flex cursor-pointer items-center justify-center transition-colors hover:bg-primary/10",
            selectedBattleIds.has(row.original.id) &&
              "bg-primary/10 text-primary ring-1 ring-inset ring-primary/40",
          )}
        >
          <label
            htmlFor={`${selectionId}-${row.original.id}`}
            className="absolute inset-0 cursor-pointer"
          >
            <span className="sr-only">{t("battlePanel.bulk.selectRow")}</span>
          </label>
          <Checkbox
            id={`${selectionId}-${row.original.id}`}
            checked={selectedBattleIds.has(row.original.id)}
            aria-label={t("battlePanel.bulk.selectRow")}
            className="relative size-5"
            onClick={stopBattleTableAction}
            onCheckedChange={(checked) =>
              handleSelectionChange(row.original.id, checked === true)
            }
          />
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "status",
      header: () => (
        <div className="text-center">
          {t("battlePanel.list.columns.result")}
        </div>
      ),
      cell: ({ row }) => renderBattleStatus(row.original),
      enableSorting: false,
    },
    {
      id: "leftTeam",
      header: t("battlePanel.list.columns.yourTeam"),
      cell: ({ row }) => {
        const { leftTeam, userWarrior } = getBattleTeams(row.original);

        return (
          <BattleTableTeamCell team={leftTeam} userWarrior={userWarrior} />
        );
      },
      enableSorting: false,
    },
    {
      id: "rightTeam",
      header: t("battlePanel.list.columns.opponents"),
      cell: ({ row }) => {
        const { rightTeam } = getBattleTeams(row.original);

        return <BattleTableTeamCell team={rightTeam} />;
      },
      enableSorting: false,
    },
    {
      id: "battleInfo",
      header: () => (
        <div className="text-left">{t("battlePanel.list.columns.info")}</div>
      ),
      cell: ({ row }) => (
        <BattleTableInfoBadges
          battle={row.original}
          onMatchmakingClick={onMatchmakingClick}
          onPhClick={onPhClick}
          onWorldClick={onWorldClick}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: t("battlePanel.list.columns.time"),
      cell: ({ row }) => {
        const battle = row.original;
        const exactTime = format(
          new Date(battle.createdAt),
          "dd.MM.yyyy HH:mm",
        );

        return (
          <div className="flex min-w-0 items-center md:min-w-[104px]">
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                    {getRelativeTime(battle.createdAt)}
                  </span>
                }
              />
              <TooltipContent>{exactTime}</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => (
        <div className="text-right">
          {t("battlePanel.list.columns.actions")}
        </div>
      ),
      cell: ({ row }) => renderBattleActions(row.original),
      enableSorting: false,
    },
  ];

  return columns;
}
