import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { ROUTES } from "@/config/routes";
import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
import {
  getBattleResult,
  getBattleTeams,
} from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelBattleCard } from "@/features/user/battle-panel/components/battle-panel-battle-card";
import type { BattlePanelFilterChip } from "@/features/user/battle-panel/components/battle-panel-filter-chip-list";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import {
  BattleDamageTags,
  getBattleDamageTags,
} from "@/features/user/battle-panel/components/battle-damage-tags";
import {
  BattleResultStatus,
  getBattleResultRowClassName,
} from "@/features/user/battle-panel/components/battle-result-status";
import { useBattleSharing } from "@/features/user/battle-panel/battle-panel-single-battle/hooks/use-battle-sharing";
import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";
import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerDeleteBattle,
  useBattlesControllerUpdateBattle,
} from "@/lib/api/generated/battlelog/battles/battles";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
} from "@/lib/api/generated/battlelog/public-battles/public-battles";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lootlog/ui/components/alert-dialog";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
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
import { cn } from "@lootlog/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Copy,
  Lock,
  MoreHorizontal,
  Share2,
  Shield,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
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

const composeBattleUrl = (battleId: string) =>
  `${BATTLELOG_PUBLIC_URL}/battles/${battleId}`;

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

const stopTableAction = (event: MouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

const stopTableKeyboardAction = (event: KeyboardEvent<HTMLElement>) => {
  event.stopPropagation();
};

const getEventTargetElement = (target: EventTarget | null) => {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
};

const isTableActionEvent = (event: MouseEvent<HTMLElement>) =>
  Boolean(
    getEventTargetElement(event.target)?.closest("[data-battle-table-action]"),
  );

const BATTLE_INFO_TAG_CLASS_NAME =
  "inline-flex h-[17px] max-w-[92px] min-w-0 items-center justify-center truncate rounded-md border border-foreground/30 bg-background/40 px-2 py-0 text-[10px] font-semibold leading-none text-muted-foreground";

const BATTLE_INFO_TAG_ACTION_CLASS_NAME =
  "cursor-pointer transition-colors hover:bg-background/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, copy] = useCopyToClipboard();
  const { handleShare, handleCopyLink, handleUnshare, isPending } =
    useBattleSharing();
  const { mutateAsync: updateBattle, isPending: isBulkSharePending } =
    useBattlesControllerUpdateBattle();
  const {
    mutate: deleteBattle,
    mutateAsync: deleteBattleAsync,
    isPending: isDeletePending,
  } = useBattlesControllerDeleteBattle();
  const [selectedBattleIds, setSelectedBattleIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [singleDeleteBattle, setSingleDeleteBattle] = useState<Battle | null>(
    null,
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const battleIdsFingerprint = battles.map((battle) => battle.id).join(",");
  const effectiveSelectionLimit = selectionLimit ?? battles.length;
  const selectedBattles = battles.filter((battle) =>
    selectedBattleIds.has(battle.id),
  );
  const visibleBattleIds = battles.map((battle) => battle.id);
  const selectableVisibleBattleIds = visibleBattleIds.slice(
    0,
    effectiveSelectionLimit,
  );
  const selectedVisibleCount = visibleBattleIds.filter((battleId) =>
    selectedBattleIds.has(battleId),
  ).length;
  const selectedSelectableVisibleCount = selectableVisibleBattleIds.filter(
    (battleId) => selectedBattleIds.has(battleId),
  ).length;
  const areAllSelectableRowsSelected =
    selectableVisibleBattleIds.length > 0 &&
    selectedSelectableVisibleCount === selectableVisibleBattleIds.length;
  let headerCheckboxState: boolean | "indeterminate" = false;

  if (areAllSelectableRowsSelected) {
    headerCheckboxState = true;
  } else if (selectedVisibleCount > 0) {
    headerCheckboxState = "indeterminate";
  }

  const isBulkBusy = isBulkSharePending || isDeletePending;
  const hasSelectedBattles = selectedBattles.length > 0;
  const isRowActionBusy = isPending || isBulkBusy;

  useEffect(() => {
    setSelectedBattleIds(new Set());
  }, [battleIdsFingerprint]);

  const invalidateBattleVisibilityQueries = async (battleIds: string[]) => {
    const invalidationPromises: Promise<unknown>[] = [
      invalidateBattlesControllerGetDashboardBattles(queryClient),
    ];

    for (const battleId of battleIds) {
      invalidationPromises.push(
        invalidateBattlesControllerGetBattle(queryClient, { battleId }),
        invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
          battleId,
        }),
        invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
          battleId,
        }),
      );
    }

    await Promise.all(invalidationPromises);
  };

  const handleOpenBattle = (battleId: string) => {
    navigate({
      to: ROUTES.user.battlePanel.battle(battleId) as string,
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    battleId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleOpenBattle(battleId);
  };

  const handleWorldBadgeClick = (
    event: MouseEvent<HTMLElement>,
    world: string,
  ) => {
    event.stopPropagation();
    onWorldClick?.(world);
  };

  const handlePhBadgeClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onPhClick?.();
  };

  const handleMatchmakingBadgeClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onMatchmakingClick?.();
  };

  const handleFilterBadgeKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    action();
  };

  const handleSelectionChange = (battleId: string, checked: boolean) => {
    if (
      checked &&
      !selectedBattleIds.has(battleId) &&
      selectedBattleIds.size >= effectiveSelectionLimit
    ) {
      toast.error(
        t("battlePanel.toasts.selectionLimitReached", {
          limit: effectiveSelectionLimit,
        }),
      );
      return;
    }

    setSelectedBattleIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (checked) {
        nextSelection.add(battleId);
        return nextSelection;
      }

      nextSelection.delete(battleId);
      return nextSelection;
    });
  };

  const handleHeaderSelectionChange = (checked: boolean) => {
    if (!checked || areAllSelectableRowsSelected) {
      setSelectedBattleIds(new Set());
      return;
    }

    setSelectedBattleIds(new Set(selectableVisibleBattleIds));
  };

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

  const handleClearSelection = () => {
    setSelectedBattleIds(new Set());
  };

  const handleBulkShare = async () => {
    if (selectedBattles.length === 0) {
      return;
    }

    const privateBattles = selectedBattles.filter((battle) => !battle.public);

    try {
      await Promise.all(
        privateBattles.map((battle) =>
          updateBattle({
            pathParams: { battleId: battle.id },
            data: { public: true },
          }),
        ),
      );

      if (privateBattles.length > 0) {
        await invalidateBattleVisibilityQueries(
          privateBattles.map((battle) => battle.id),
        );
      }
    } catch {
      toast.error(t("battlePanel.toasts.bulkBattleShareError"), {
        duration: 3000,
      });
      return;
    }

    try {
      const links = selectedBattles
        .map((battle) => composeBattleUrl(battle.id))
        .join(", ");
      const copied = await copy(links);

      if (!copied) {
        throw new Error("Bulk links were not copied");
      }

      toast.success(
        t("battlePanel.toasts.bulkBattlesShared", {
          count: selectedBattles.length,
        }),
        {
          duration: 3000,
        },
      );
    } catch {
      toast.error(t("battlePanel.toasts.linkCopyError"), {
        duration: 3000,
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBattles.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedBattles.map((battle) =>
          deleteBattleAsync({
            pathParams: { battleId: battle.id },
          }),
        ),
      );
      await invalidateBattlesControllerGetDashboardBattles(queryClient);
      toast.success(
        t("battlePanel.toasts.bulkBattlesDeleted", {
          count: selectedBattles.length,
        }),
        {
          duration: 3000,
        },
      );
      setSelectedBattleIds(new Set());
      setIsBulkDeleteDialogOpen(false);
    } catch {
      toast.error(t("battlePanel.toasts.bulkBattleDeleteError"), {
        duration: 3000,
      });
    }
  };

  const handleSingleDelete = () => {
    if (!singleDeleteBattle) {
      return;
    }

    deleteBattle(
      {
        pathParams: {
          battleId: singleDeleteBattle.id,
        },
      },
      {
        onSuccess: async () => {
          await invalidateBattlesControllerGetDashboardBattles(queryClient);
          toast.success(t("battlePanel.toasts.battleDeleted"), {
            duration: 3000,
          });
          setSelectedBattleIds((currentSelection) => {
            const nextSelection = new Set(currentSelection);
            nextSelection.delete(singleDeleteBattle.id);
            return nextSelection;
          });
          setSingleDeleteBattle(null);
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleDeleteError"), {
            duration: 3000,
          });
        },
      },
    );
  };

  const renderTeam = (
    team: BattleWarrior[],
    opposingTeam: BattleWarrior[],
    userWarrior?: BattleWarrior,
  ) => {
    const hasTags = getBattleDamageTags(team, opposingTeam).length > 0;
    const tagIcons = hasTags ? (
      <BattleDamageTags
        team={team}
        opposingTeam={opposingTeam}
        className="ml-1"
        battleTableAction
        containerProps={{
          onClick: stopTableAction,
          onClickCapture: stopTableAction,
          onKeyDown: stopTableKeyboardAction,
        }}
        badgeProps={{
          onClick: stopTableAction,
          onKeyDown: stopTableKeyboardAction,
        }}
      />
    ) : null;
    const shouldRenderInlineTags = team.length === 1;

    return (
      <div className="flex min-w-0 max-w-[120px] flex-col gap-1 md:min-w-[220px] md:max-w-[280px]">
        {team.map((warrior) => (
          <div key={warrior.id} className="flex min-w-0 items-center gap-1.5">
            <PlayerTile player={warrior} className="origin-center scale-75" />
            <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
              <span
                className={cn("min-w-0 truncate text-xs font-medium", {
                  "text-green-500":
                    warrior.originalId === userWarrior?.originalId,
                })}
              >
                {warrior.name}
              </span>
              <span className="truncate text-[11px] font-normal text-muted-foreground">
                ({warrior.lvl}
                {warrior.prof})
              </span>
            </div>
            {shouldRenderInlineTags && tagIcons}
          </div>
        ))}
        {!shouldRenderInlineTags && tagIcons && (
          <div className="ml-7 flex min-w-0">{tagIcons}</div>
        )}
      </div>
    );
  };

  const renderBattleStatus = (battle: Battle) => {
    const result = getBattleResult(battle);

    return (
      <div
        data-battle-table-action
        onClick={stopTableAction}
        onKeyDown={stopTableKeyboardAction}
        className="mx-auto flex w-6 items-center justify-center"
      >
        <BattleResultStatus result={result} />
      </div>
    );
  };

  const renderBattleInfo = (battle: Battle) => {
    const visibilityLabel = battle.public
      ? t("battleUi.metadata.public")
      : t("battleUi.metadata.private");
    const userWarrior = battle.warriors.find(
      (warrior) => warrior.originalId === battle.characterId,
    );

    return (
      <div
        data-battle-table-action
        onClick={stopTableAction}
        onKeyDown={stopTableKeyboardAction}
        className="flex max-w-[168px] flex-wrap items-center gap-1"
      >
        <button
          type="button"
          data-battle-table-action
          onClick={(event) => handleWorldBadgeClick(event, battle.world)}
          onKeyDown={stopTableKeyboardAction}
          className={cn(
            BATTLE_INFO_TAG_CLASS_NAME,
            BATTLE_INFO_TAG_ACTION_CLASS_NAME,
          )}
        >
          {capitalizeFirstLetter(battle.world)}
        </button>
        <span className={BATTLE_INFO_TAG_CLASS_NAME}>{visibilityLabel}</span>
        {userWarrior?.ph !== 0 && userWarrior?.ph !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                onClick={handlePhBadgeClick}
                onKeyDown={(event) =>
                  handleFilterBadgeKeyDown(event, () => onPhClick?.())
                }
                role="button"
                tabIndex={0}
                variant="outline"
                className={cn(
                  BATTLE_INFO_TAG_CLASS_NAME,
                  BATTLE_INFO_TAG_ACTION_CLASS_NAME,
                )}
              >
                {t("battlePanel.bulk.honorPointsShort")}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {t("battlePanel.filters.honorPoints")}
            </TooltipContent>
          </Tooltip>
        )}
        {battle.matchmaking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                onClick={handleMatchmakingBadgeClick}
                onKeyDown={(event) =>
                  handleFilterBadgeKeyDown(event, () => onMatchmakingClick?.())
                }
                role="button"
                tabIndex={0}
                variant="outline"
                className={cn(
                  BATTLE_INFO_TAG_CLASS_NAME,
                  BATTLE_INFO_TAG_ACTION_CLASS_NAME,
                  "border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
                )}
              >
                {t("battlePanel.filters.matchmaking")}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {t("battlePanel.filters.matchmaking")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  const renderBattleActions = (battle: Battle) => {
    return (
      <div
        data-battle-table-action
        className="flex justify-end"
        onClick={stopTableAction}
        onKeyDown={stopTableKeyboardAction}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t("battlePanel.actions.more")}
              variant="ghost"
              size="icon"
              className="size-7 md:size-8"
              disabled={isRowActionBusy}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {battle.public ? (
              <>
                <DropdownMenuItem onSelect={() => handleCopyLink(battle.id)}>
                  <Copy className="size-4" />
                  {t("battlePanel.actions.copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleUnshare(battle.id)}>
                  <Lock className="size-4" />
                  {t("battlePanel.actions.hide")}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => handleShare(battle.id)}>
                <Share2 className="size-4" />
                {t("battlePanel.actions.share")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setSingleDeleteBattle(battle)}
            >
              <Trash2 className="size-4" />
              {t("battlePanel.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
          onKeyDown={stopTableKeyboardAction}
        >
          <Checkbox
            checked={headerCheckboxState}
            aria-label={t("battlePanel.bulk.selectRows")}
            className="size-5"
            onClick={stopTableAction}
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
          onKeyDown={stopTableKeyboardAction}
        >
          <Checkbox
            checked={selectedBattleIds.has(row.original.id)}
            aria-label={t("battlePanel.bulk.selectRow")}
            className="size-5"
            onClick={stopTableAction}
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

        return renderTeam(leftTeam, rightTeam, userWarrior);
      },
      enableSorting: false,
    },
    {
      id: "rightTeam",
      header: t("battlePanel.list.columns.opponents"),
      cell: ({ row }) => {
        const { leftTeam, rightTeam } = getBattleTeams(row.original);

        return renderTeam(rightTeam, leftTeam);
      },
      enableSorting: false,
    },
    {
      id: "battleInfo",
      header: () => (
        <div className="text-left">{t("battlePanel.list.columns.info")}</div>
      ),
      cell: ({ row }) => renderBattleInfo(row.original),
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
              <TooltipTrigger asChild>
                <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                  {getRelativeTime(battle.createdAt)}
                </span>
              </TooltipTrigger>
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
      onClearSelection={handleClearSelection}
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
                onBattleClick={handleOpenBattle}
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
                  "h-14 cursor-pointer border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
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
              getRowProps={(row) => ({
                role: "link",
                tabIndex: 0,
                "aria-label": t("battlePanel.list.openBattle"),
                onClick: (event) => {
                  if (isTableActionEvent(event)) {
                    return;
                  }

                  handleOpenBattle(row.original.id);
                },
                onKeyDown: (event) => {
                  if (
                    getEventTargetElement(event.target)?.closest(
                      "[data-battle-table-action]",
                    )
                  ) {
                    return;
                  }

                  handleRowKeyDown(event, row.original.id);
                },
              })}
            />
          </Table>
        )}
      </BattlePanelResultsSurface>

      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
      >
        <AlertDialogContent onClick={stopTableAction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("battlePanel.bulk.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("battlePanel.bulk.deleteDialog.description", {
                count: selectedBattles.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeletePending}
              >
                {t("battlePanel.bulk.deleteDialog.confirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(singleDeleteBattle)}
        onOpenChange={(open) => {
          if (!open) {
            setSingleDeleteBattle(null);
          }
        }}
      >
        <AlertDialogContent onClick={stopTableAction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("battlePanel.dialogs.deleteBattle.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("battlePanel.dialogs.deleteBattle.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleSingleDelete}
                disabled={isDeletePending}
              >
                {t("battlePanel.dialogs.deleteBattle.confirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
