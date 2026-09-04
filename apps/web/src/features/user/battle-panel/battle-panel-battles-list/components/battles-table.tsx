import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import {
  getBattleResult,
  getBattleTeams,
} from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelBattleCard } from "@/features/user/battle-panel/components/battle-panel-battle-card";
import type { BattlePanelFilterChip } from "@/features/user/battle-panel/components/battle-panel-filter-chip-list";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import {
  BattleResultStatus,
  getBattleResultRowClassName,
} from "@/features/user/battle-panel/components/battle-result-status";
import { useBattleTableActions } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-actions";
import { useBattleTableSelection } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-selection";
import type { Battle } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { Table } from "@lootlog/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "cn";
import {
  getCoreRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Shield } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BattleTableActionsMenu } from "./battle-table-actions-menu";
import { BattleTableDeleteDialogs } from "./battle-table-delete-dialogs";
import {
  stopBattleTableAction,
  stopBattleTableKeyboardAction,
} from "./battle-table-events";
import { BattleTableInfoBadges } from "./battle-table-info-badges";
import { BattleTableTeamCell } from "./battle-table-team-cell";
import { BattlesBulkActionsBar } from "./battles-bulk-actions-bar";

type BattlesTableProps = {
  activeFilterChips?: BattlePanelFilterChip[];
  battles: Battle[];
  clearFiltersLabel?: string;
  hasNext?: boolean;
  hasPrev?: boolean;
  isLoading?: boolean;
  onClearFilters?: () => void;
  onMatchmakingClick?: () => void;
  onNextPage?: () => void;
  onPhClick?: () => void;
  onPreviousPage?: () => void;
  onWorldClick?: (world: string) => void;
  pageIndex?: number;
  pageSize?: number;
  selectionLimit?: number;
  showPagination?: boolean;
  totalCount?: number;
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
};

const getRowClassName = (battle: Battle) => {
  return getBattleResultRowClassName(getBattleResult(battle));
};

const getColumnResponsiveClassName = (columnId: string) => {
  if (columnId === "select") {
    return "relative w-[9%] px-0! md:w-12";
  }

  if (columnId === "status") {
    return "w-[10%] px-1 md:w-[64px]";
  }

  if (columnId === "battleInfo") {
    return "w-[20%] px-1 md:w-[176px]";
  }

  if (columnId === "leftTeam" || columnId === "rightTeam") {
    return "w-[24%] md:w-[240px]";
  }

  if (columnId === "createdAt") {
    return "w-[20%] md:w-[112px]";
  }

  if (columnId === "actions") {
    return "w-[14%] md:w-[64px]";
  }

  return "";
};

const BATTLE_TABLE_LINK_COLUMN_IDS = new Set([
  "status",
  "leftTeam",
  "rightTeam",
  "createdAt",
]);

const BATTLE_TABLE_PRIMARY_LINK_COLUMN_ID = "leftTeam";

export const BattlesTable = ({
  activeFilterChips = [],
  battles,
  clearFiltersLabel,
  hasNext = false,
  hasPrev = false,
  isLoading = false,
  onClearFilters,
  onMatchmakingClick,
  onNextPage,
  onPhClick,
  onPreviousPage,
  onWorldClick,
  pageIndex = 0,
  pageSize = 20,
  selectionLimit,
  showPagination = false,
  totalCount = 0,
  toolbar,
  toolbarEnd,
}: BattlesTableProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    areAllSelectableRowsSelected,
    clearSelection,
    handleHeaderSelectionChange,
    handleSelectionChange,
    hasSelectedBattles,
    headerCheckboxState,
    removeBattleFromSelection,
    selectedBattleIds,
    selectedBattles,
  } = useBattleTableSelection({
    battles,
    selectionLimit,
    onSelectionLimitReached: (limit) => {
      toast.error(
        t("battlePanel.toasts.selectionLimitReached", {
          limit,
        }),
      );
    },
  });
  const {
    handleBulkDelete,
    handleBulkShare,
    handleCopyLink,
    handleShare,
    handleSingleDelete,
    handleUnshare,
    isBulkBusy,
    isBulkDeleteDialogOpen,
    isDeletePending,
    isRowActionBusy,
    setIsBulkDeleteDialogOpen,
    setSingleDeleteBattle,
    singleDeleteBattle,
  } = useBattleTableActions({
    clearSelection,
    removeBattleFromSelection,
    selectedBattles,
  });

  const handleHeaderSelectionCellClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    handleHeaderSelectionChange(!areAllSelectableRowsSelected);
  };

  const handleSelectionCellClick = (
    event: MouseEvent<HTMLElement>,
    battleId: string,
  ) => {
    event.stopPropagation();
    handleSelectionChange(battleId, !selectedBattleIds.has(battleId));
  };

  const renderBattleStatus = (battle: Battle) => {
    const result = getBattleResult(battle);

    return (
      <div className="mx-auto flex w-6 items-center justify-center">
        <BattleResultStatus result={result} />
      </div>
    );
  };

  const renderBattleLinkCellContent = (
    cell: Cell<Battle, unknown>,
    content: ReactNode,
  ) => {
    if (!BATTLE_TABLE_LINK_COLUMN_IDS.has(cell.column.id)) {
      return content;
    }

    return (
      <Link
        aria-label={
          cell.column.id === BATTLE_TABLE_PRIMARY_LINK_COLUMN_ID
            ? t("battlePanel.list.openBattle")
            : undefined
        }
        tabIndex={
          cell.column.id === BATTLE_TABLE_PRIMARY_LINK_COLUMN_ID ? 0 : -1
        }
        to="/@me/battle-panel/battles/$battleId"
        params={{ battleId: cell.row.original.id }}
        preload={false}
        className="flex min-h-12 w-full items-center rounded-sm text-inherit outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
      >
        {content}
      </Link>
    );
  };

  const renderBattleActions = (battle: Battle) => {
    return (
      <BattleTableActionsMenu
        battle={battle}
        disabled={isRowActionBusy}
        onCopyLink={handleCopyLink}
        onDelete={setSingleDeleteBattle}
        onShare={handleShare}
        onUnshare={handleUnshare}
      />
    );
  };

  const columns: ColumnDef<Battle>[] = [
    {
      id: "select",
      header: () => (
        <div
          data-battle-table-action
          className="absolute inset-0 flex cursor-pointer items-center justify-center transition-colors hover:bg-primary/10"
          onClick={handleHeaderSelectionCellClick}
          onKeyDown={stopBattleTableKeyboardAction}
        >
          <Checkbox
            checked={headerCheckboxState === true}
            indeterminate={headerCheckboxState === "indeterminate"}
            aria-label={t("battlePanel.bulk.selectRows")}
            className="size-5"
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
          onClick={(event) => handleSelectionCellClick(event, row.original.id)}
          onKeyDown={stopBattleTableKeyboardAction}
        >
          <Checkbox
            checked={selectedBattleIds.has(row.original.id)}
            aria-label={t("battlePanel.bulk.selectRow")}
            className="size-5"
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
        const { leftTeam, rightTeam, userWarrior } = getBattleTeams(
          row.original,
        );

        return (
          <BattleTableTeamCell
            team={leftTeam}
            opposingTeam={rightTeam}
            userWarrior={userWarrior}
          />
        );
      },
      enableSorting: false,
    },
    {
      id: "rightTeam",
      header: t("battlePanel.list.columns.opponents"),
      cell: ({ row }) => {
        const { leftTeam, rightTeam } = getBattleTeams(row.original);

        return <BattleTableTeamCell team={rightTeam} opposingTeam={leftTeam} />;
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

  const table = useReactTable({
    data: battles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectionBar = hasSelectedBattles ? (
    <BattlesBulkActionsBar
      disabled={isBulkBusy}
      onClearSelection={clearSelection}
      onDelete={() => setIsBulkDeleteDialogOpen(true)}
      onShare={handleBulkShare}
      selectedCount={selectedBattles.length}
    />
  ) : undefined;
  const paginationFooter = showPagination ? (
    <BattlePanelPaginationFooter
      label={({ from, to, total }) =>
        t("battlePanel.list.showingBattles", {
          from,
          to,
          total,
        })
      }
      hasPrev={hasPrev}
      hasNext={hasNext}
      pageIndex={pageIndex}
      pageSize={pageSize}
      totalCount={totalCount}
      visibleCount={battles.length}
      onPreviousPage={onPreviousPage ?? (() => undefined)}
      onNextPage={onNextPage ?? (() => undefined)}
    />
  ) : undefined;

  return (
    <>
      <BattlePanelResultsSurface
        chips={activeFilterChips}
        clearFiltersLabel={clearFiltersLabel}
        footer={paginationFooter}
        onClearFilters={onClearFilters}
        selectionBar={selectionBar}
        toolbar={toolbar}
        toolbarEnd={toolbarEnd}
        withHorizontalScroll={!isMobile}
      >
        {isLoading ? (
          <TableRowsSkeleton rows={showPagination ? 10 : 4} />
        ) : battles.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center",
              showPagination ? "min-h-[360px]" : "min-h-48",
            )}
          >
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shield />
                </EmptyMedia>
                <EmptyTitle>{t("battlePanel.list.empty")}</EmptyTitle>
                <EmptyDescription>
                  {t("battlePanel.list.emptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : isMobile ? (
          <div className="flex flex-col gap-2 p-3">
            {battles.map((battle) => (
              <BattlePanelBattleCard
                key={battle.id}
                actions={renderBattleActions(battle)}
                battle={battle}
                isChecked={selectedBattleIds.has(battle.id)}
                onSelectionChange={handleSelectionChange}
              />
            ))}
          </div>
        ) : (
          <Table className="min-w-full table-fixed border-b md:min-w-[960px] md:table-auto">
            <TanStackTableHeader
              table={table}
              className="sticky top-0 z-10 bg-background"
              rowClassName="border-b-1! border-border"
              headClassName={(header) =>
                cn(
                  "whitespace-nowrap align-middle",
                  getColumnResponsiveClassName(header.column.id),
                )
              }
            />
            <TanStackTableBody
              table={table}
              rowClassName={(row) =>
                cn(
                  "h-14 border-b border-border",
                  getRowClassName(row.original),
                  selectedBattleIds.has(row.original.id) &&
                    "ring-2 ring-inset ring-primary/45",
                )
              }
              cellClassName={(cell) =>
                cn(
                  "whitespace-nowrap align-middle",
                  getColumnResponsiveClassName(cell.column.id),
                )
              }
              renderCellContent={renderBattleLinkCellContent}
            />
          </Table>
        )}
      </BattlePanelResultsSurface>

      <BattleTableDeleteDialogs
        isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
        isDeletePending={isDeletePending}
        onBulkDelete={handleBulkDelete}
        onBulkDeleteOpenChange={setIsBulkDeleteDialogOpen}
        onSingleDelete={handleSingleDelete}
        onSingleDeleteOpenChange={(open) => {
          if (!open) {
            setSingleDeleteBattle(null);
          }
        }}
        selectedCount={selectedBattles.length}
        singleDeleteBattle={singleDeleteBattle}
      />
    </>
  );
};
