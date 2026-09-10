import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { useBattleTableActions } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-actions";
import { useBattleTableSelection } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-selection";
import { BattlePanelBattleCard } from "@/features/user/battle-panel/components/battle-panel-battle-card";
import {
  getBattleResult,
  getBattleTeams,
} from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import type { BattlePanelFilterChip } from "@/features/user/battle-panel/components/battle-panel-filter-chip-list";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import { getBattleResultRowClassName } from "@/features/user/battle-panel/components/battle-result-row-class-name";
import type { Battle } from "@/lib/api/battlelog-types";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { Table } from "@lootlog/ui/components/table";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Link } from "@tanstack/react-router";
import { type Cell, useTable } from "@tanstack/react-table";
import { cn } from "cn";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BattleTableActionsMenu } from "./battle-table-actions-menu";
import { BattleTableDeleteDialogs } from "./battle-table-delete-dialogs";
import { BattlesBulkActionsBar } from "./battles-bulk-actions-bar";
import { useBattleTableColumns } from "./use-battle-table-columns";

type BattlesTableProps = {
  activeFilterChips?: BattlePanelFilterChip[];
  battles: Battle[];
  clearFiltersLabel?: string;
  isLoading?: boolean;
  onClearFilters?: () => void;
  onMatchmakingClick?: () => void;
  onPhClick?: () => void;
  onWorldClick?: (world: string) => void;
  selectionLimit?: number;
  pagination?: {
    hasNext: boolean;
    hasPrev: boolean;
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    onNextPage?: () => void;
    onPreviousPage?: () => void;
  };
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

const getBattleCellLink = (battle: Battle, columnId: string) => {
  const { leftTeam, rightTeam } = getBattleTeams(battle);
  if (
    !BATTLE_TABLE_LINK_COLUMN_IDS.has(columnId) ||
    (columnId === "leftTeam" && leftTeam.length > 1) ||
    (columnId === "rightTeam" && rightTeam.length > 1)
  ) {
    return undefined;
  }
  const primaryColumnId =
    leftTeam.length > 1 ? "status" : BATTLE_TABLE_PRIMARY_LINK_COLUMN_ID;
  return columnId === primaryColumnId ? "primary" : "secondary";
};

export const BattlesTable = ({
  activeFilterChips,
  battles,
  clearFiltersLabel,
  isLoading = false,
  onClearFilters,
  onMatchmakingClick,
  onPhClick,
  onWorldClick,
  selectionLimit,
  pagination,
  toolbar,
  toolbarEnd,
}: BattlesTableProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
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
    isBulkSharePending,
    pendingBattleId,
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

  const renderBattleLinkCellContent = (
    cell: Cell<typeof coreTableFeatures, Battle, unknown>,
    content: ReactNode,
  ) => {
    const link = getBattleCellLink(cell.row.original, cell.column.id);
    if (!link) {
      return content;
    }

    return (
      <Link
        aria-label={
          link === "primary" ? t("battlePanel.list.openBattle") : undefined
        }
        tabIndex={link === "primary" ? 0 : -1}
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
        loading={pendingBattleId === battle.id}
        onCopyLink={handleCopyLink}
        onDelete={setSingleDeleteBattle}
        onShare={handleShare}
        onUnshare={handleUnshare}
      />
    );
  };

  const columns = useBattleTableColumns({
    headerCheckboxState,
    handleHeaderSelectionChange,
    selectedBattleIds,
    handleSelectionChange,
    onMatchmakingClick,
    onPhClick,
    onWorldClick,
    renderBattleActions,
  });

  const table = useTable({
    features: coreTableFeatures,
    data: battles,
    columns,
  });

  const selectionBar = hasSelectedBattles ? (
    <BattlesBulkActionsBar
      disabled={isBulkBusy || isRowActionBusy}
      sharePending={isBulkSharePending}
      onClearSelection={clearSelection}
      onDelete={() => setIsBulkDeleteDialogOpen(true)}
      onShare={handleBulkShare}
      selectedCount={selectedBattles.length}
    />
  ) : undefined;
  const paginationFooter = pagination ? (
    <BattlePanelPaginationFooter
      label={({ from, to, total }) =>
        t("battlePanel.list.showingBattles", {
          from,
          to,
          total,
        })
      }
      hasPrev={pagination.hasPrev}
      hasNext={pagination.hasNext}
      pageIndex={pagination.pageIndex}
      pageSize={pagination.pageSize}
      totalCount={pagination.totalCount}
      visibleCount={battles.length}
      onPreviousPage={pagination.onPreviousPage ?? (() => undefined)}
      onNextPage={pagination.onNextPage ?? (() => undefined)}
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
          <TableRowsSkeleton rows={pagination ? 10 : 4} />
        ) : battles.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center",
              pagination ? "min-h-[360px]" : "min-h-48",
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
          <Table className="battle-panel-battles-table min-w-full table-fixed border-b md:min-w-[960px] md:table-auto">
            <TanStackTableHeader
              table={table}
              className="sticky top-0 z-10 bg-background"
              rowClassName="border-b-1! border-border"
              getHeadClassName={(header) =>
                cn(
                  "whitespace-nowrap align-middle",
                  getColumnResponsiveClassName(header.column.id),
                )
              }
            />
            <TanStackTableBody
              table={table}
              getRowClassName={(row) =>
                cn(
                  "h-14 border-b border-border",
                  getRowClassName(row.original),
                  selectedBattleIds.has(row.original.id) &&
                    "ring-2 ring-inset ring-primary/45",
                )
              }
              getCellClassName={(cell) =>
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
