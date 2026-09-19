import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { useBattleTableActions } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-actions";
import { useBattleTableSelection } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-selection";
import { BattlePanelBattleCard } from "@/features/user/battle-panel/components/battle-panel-battle-card";
import { BattlePanelBattleCardSkeleton } from "@/features/user/battle-panel/components/battle-panel-battle-card-skeleton";
import { getBattleResult } from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import type { FilterChip } from "@/components/common/filter-chip-list";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { ResultsSurface } from "@/components/common/results-surface";
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
import { getBattleTableColumnClassName } from "./battle-table-column-class-name";
import { BattleTableDeleteDialogs } from "./battle-table-delete-dialogs";
import { BattlesBulkActionsBar } from "./battles-bulk-actions-bar";
import { BattlesTableSkeletonBody } from "./battles-table-skeleton-body";
import { useBattleTableColumns } from "./use-battle-table-columns";

type BattlesTableProps = {
  activeFilterChips?: FilterChip[];
  battles: Battle[];
  clearFiltersLabel?: string;
  isLoading?: boolean;
  /** Previous results stay visible while the next page or filter set loads. */
  isRefreshing?: boolean;
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

// Cells whose whole area opens the battle, so a click anywhere outside the
// selection and actions cells navigates.
const BATTLE_TABLE_LINK_COLUMN_IDS = new Set([
  "status",
  "leftTeam",
  "rightTeam",
  "battleInfo",
  "createdAt",
]);

const BATTLE_TABLE_PRIMARY_LINK_COLUMN_ID = "leftTeam";

// The info cell keeps its own filter buttons, so its link sits underneath them
// instead of wrapping them.
const BATTLE_TABLE_OVERLAY_LINK_COLUMN_ID = "battleInfo";

const LOADING_ROW_COUNT_WITHOUT_PAGINATION = 4;

export const BattlesTable = ({
  activeFilterChips,
  battles,
  clearFiltersLabel,
  isLoading = false,
  isRefreshing = false,
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
    const columnId = cell.column.id;

    if (!BATTLE_TABLE_LINK_COLUMN_IDS.has(columnId)) {
      return content;
    }

    const isPrimary = columnId === BATTLE_TABLE_PRIMARY_LINK_COLUMN_ID;

    const linkProps = {
      to: "/@me/battle-panel/battles/$battleId",
      params: { battleId: cell.row.original.id },
      preload: false,
    } as const;

    if (columnId === BATTLE_TABLE_OVERLAY_LINK_COLUMN_ID) {
      return (
        <>
          <Link
            {...linkProps}
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0"
          />
          {content}
        </>
      );
    }

    return (
      <Link
        {...linkProps}
        aria-label={isPrimary ? t("battlePanel.list.openBattle") : undefined}
        tabIndex={isPrimary ? 0 : -1}
        className="flex min-h-10 w-full items-center rounded-sm text-inherit outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
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

  const loadingRowCount =
    pagination?.pageSize ?? LOADING_ROW_COUNT_WITHOUT_PAGINATION;

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
      isLoading={isLoading}
      onPreviousPage={pagination.onPreviousPage ?? (() => undefined)}
      onNextPage={pagination.onNextPage ?? (() => undefined)}
    />
  ) : undefined;

  return (
    <>
      <ResultsSurface
        chips={activeFilterChips}
        clearFiltersLabel={clearFiltersLabel}
        footer={paginationFooter}
        onClearFilters={onClearFilters}
        selectionBar={selectionBar}
        toolbar={toolbar}
        toolbarEnd={toolbarEnd}
        toolbarLabel={t("battlePanel.filters.title")}
        withHorizontalScroll={!isMobile}
      >
        {!isLoading && battles.length === 0 ? (
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
          <div
            aria-busy={isLoading || isRefreshing}
            className={cn("flex flex-col", isRefreshing && "opacity-60")}
          >
            {isLoading
              ? Array.from({ length: loadingRowCount }).map((_, index) => (
                  <BattlePanelBattleCardSkeleton key={index} />
                ))
              : battles.map((battle) => (
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
          <Table
            aria-busy={isLoading || isRefreshing}
            className="battle-panel-battles-table min-w-full table-fixed border-b md:min-w-[960px] md:table-auto"
          >
            <TanStackTableHeader
              table={table}
              className="sticky top-0 z-10 bg-background"
              rowClassName="border-b-1! border-border"
              getHeadClassName={(header) =>
                cn(
                  "whitespace-nowrap align-middle",
                  getBattleTableColumnClassName(header.column.id),
                )
              }
            />
            {isLoading ? (
              <BattlesTableSkeletonBody
                columnIds={table
                  .getVisibleLeafColumns()
                  .map((column) => column.id)}
                rows={loadingRowCount}
              />
            ) : (
              <TanStackTableBody
                table={table}
                getRowClassName={(row) =>
                  cn(
                    "h-14 border-b border-border",
                    getRowClassName(row.original),
                    isRefreshing && "opacity-60",
                    selectedBattleIds.has(row.original.id) &&
                      "ring-2 ring-inset ring-primary/45",
                  )
                }
                getCellClassName={(cell) =>
                  cn(
                    "whitespace-nowrap align-middle",
                    BATTLE_TABLE_LINK_COLUMN_IDS.has(cell.column.id) &&
                      "relative",
                    getBattleTableColumnClassName(cell.column.id),
                  )
                }
                renderCellContent={renderBattleLinkCellContent}
              />
            )}
          </Table>
        )}
      </ResultsSurface>

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
