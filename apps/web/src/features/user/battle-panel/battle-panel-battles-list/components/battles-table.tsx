import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { ROUTES } from "@/config/routes";
import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
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
import { Card } from "@lootlog/ui/components/card";
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
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Table } from "@lootlog/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
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
  LockOpen,
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

type BattleResult = "won" | "lost" | "flee";
type BattleDamageTag = "fire" | "frost" | "lightning" | "poison" | "wound";

type BattlesTableProps = {
  battles: Battle[];
  hasNext?: boolean;
  hasPrev?: boolean;
  isLoading?: boolean;
  onMatchmakingClick?: () => void;
  onNextPage?: () => void;
  onPhClick?: () => void;
  onPreviousPage?: () => void;
  onWorldClick?: (world: string) => void;
  selectionLimit?: number;
  showPagination?: boolean;
  totalCount?: number;
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
};

type BattleTeamDamageTag = {
  badgeClassName: string;
  key: BattleDamageTag;
};

const MOBILE_HIDDEN_COLUMN_IDS = new Set(["world", "tags", "mode"]);

const DAMAGE_TAG_CLASS_NAMES: Record<
  BattleDamageTag,
  Pick<BattleTeamDamageTag, "badgeClassName">
> = {
  fire: {
    badgeClassName: "border-red-500/20 bg-red-500/5 text-red-300",
  },
  frost: {
    badgeClassName: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
  },
  lightning: {
    badgeClassName: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
  },
  poison: {
    badgeClassName: "border-green-500/20 bg-green-500/5 text-green-300",
  },
  wound: {
    badgeClassName: "border-orange-500/20 bg-orange-500/5 text-orange-300",
  },
};

const composeBattleUrl = (battleId: string) =>
  `${BATTLELOG_PUBLIC_URL}/battles/${battleId}`;

const getBattleTeams = (battle: Battle) => {
  const attackingTeam = battle.warriors.filter((warrior) => warrior.team === 1);
  const defendingTeam = battle.warriors.filter((warrior) => warrior.team === 2);
  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  );

  if (userWarrior?.team === 1) {
    return {
      leftTeam: attackingTeam,
      rightTeam: defendingTeam,
      userWarrior,
    };
  }

  return {
    leftTeam: defendingTeam,
    rightTeam: attackingTeam,
    userWarrior,
  };
};

const getBattleResult = (battle: Battle): BattleResult => {
  if (battle.hasFlee) {
    return "flee";
  }

  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  );

  if (battle.winningTeam === userWarrior?.team) {
    return "won";
  }

  return "lost";
};

const sumWarriorValues = (
  warriors: BattleWarrior[],
  getValue: (warrior: BattleWarrior) => number,
) => warriors.reduce((total, warrior) => total + getValue(warrior), 0);

const getTeamDamageTags = (
  team: BattleWarrior[],
  opposingTeam: BattleWarrior[],
): BattleTeamDamageTag[] => {
  const tags: BattleTeamDamageTag[] = [];

  if (sumWarriorValues(team, (warrior) => warrior.fireDamage) > 0) {
    tags.push({ key: "fire", ...DAMAGE_TAG_CLASS_NAMES.fire });
  }

  if (sumWarriorValues(team, (warrior) => warrior.frostDamage) > 0) {
    tags.push({ key: "frost", ...DAMAGE_TAG_CLASS_NAMES.frost });
  }

  if (sumWarriorValues(team, (warrior) => warrior.lightningDamage) > 0) {
    tags.push({
      key: "lightning",
      ...DAMAGE_TAG_CLASS_NAMES.lightning,
    });
  }

  if (
    sumWarriorValues(opposingTeam, (warrior) => warrior.poisonDamageTaken) > 0
  ) {
    tags.push({ key: "poison", ...DAMAGE_TAG_CLASS_NAMES.poison });
  }

  if (
    sumWarriorValues(
      opposingTeam,
      (warrior) => warrior.woundDamageTaken + warrior.critWoundDamageTaken,
    ) > 0
  ) {
    tags.push({ key: "wound", ...DAMAGE_TAG_CLASS_NAMES.wound });
  }

  return tags;
};

const mergeDamageTags = (
  tagGroups: BattleTeamDamageTag[][],
): BattleTeamDamageTag[] => {
  const tagsByKey = new Map<BattleDamageTag, BattleTeamDamageTag>();

  for (const tagGroup of tagGroups) {
    for (const tag of tagGroup) {
      if (!tagsByKey.has(tag.key)) {
        tagsByKey.set(tag.key, tag);
      }
    }
  }

  return Array.from(tagsByKey.values());
};

const getRowClassName = (battle: Battle) => {
  const result = getBattleResult(battle);

  if (result === "won") {
    return "bg-green-500/5 hover:bg-green-500/10";
  }

  if (result === "lost") {
    return "bg-red-500/5 hover:bg-red-500/10";
  }

  return "bg-yellow-500/5 hover:bg-yellow-500/10";
};

const getColumnResponsiveClassName = (columnId: string) => {
  if (MOBILE_HIDDEN_COLUMN_IDS.has(columnId)) {
    return "hidden md:table-cell";
  }

  if (columnId === "select") {
    return "w-[9%] px-2 md:w-10";
  }

  if (columnId === "leftTeam" || columnId === "rightTeam") {
    return "w-[27%] md:w-auto";
  }

  if (columnId === "createdAt") {
    return "w-[22%] md:w-[112px]";
  }

  if (columnId === "world") {
    return "md:w-[116px]";
  }

  if (columnId === "tags") {
    return "md:w-[176px]";
  }

  if (columnId === "mode") {
    return "md:w-[76px]";
  }

  if (columnId === "actions") {
    return "w-[15%] md:w-[64px]";
  }

  return "";
};

const stopTableAction = (event: MouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

const stopTableKeyboardAction = (event: KeyboardEvent<HTMLElement>) => {
  event.stopPropagation();
};

const isTableActionEvent = (event: MouseEvent<HTMLElement>) =>
  event.target instanceof Element &&
  Boolean(event.target.closest("[data-battle-table-action]"));

export const BattlesTable = ({
  battles,
  hasNext = false,
  hasPrev = false,
  isLoading = false,
  onMatchmakingClick,
  onNextPage,
  onPhClick,
  onPreviousPage,
  onWorldClick,
  selectionLimit,
  showPagination = false,
  totalCount = 0,
  toolbar,
  toolbarEnd,
}: BattlesTableProps) => {
  const { t } = useTranslation();
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

  const renderTeam = (team: BattleWarrior[], userWarrior?: BattleWarrior) => (
    <div className="flex min-w-0 max-w-[112px] flex-col gap-1 md:min-w-[200px] md:max-w-[300px]">
      {team.map((warrior) => (
        <div key={warrior.id} className="flex min-w-0 items-center gap-1.5">
          <PlayerTile player={warrior} className="scale-75" />
          <span
            className={cn("min-w-0 truncate text-xs font-medium", {
              "text-green-500": warrior.originalId === userWarrior?.originalId,
            })}
          >
            {warrior.name}{" "}
            <span className="text-muted-foreground font-normal">
              ({warrior.lvl}
              {warrior.prof})
            </span>
          </span>
        </div>
      ))}
    </div>
  );

  const renderDamageTags = (
    team: BattleWarrior[],
    opposingTeam: BattleWarrior[],
  ) => {
    const tags = mergeDamageTags([
      getTeamDamageTags(team, opposingTeam),
      getTeamDamageTags(opposingTeam, team),
    ]);

    if (tags.length === 0) {
      return (
        <span className="text-xs text-muted-foreground/70">
          {t("battlePanel.list.noTags")}
        </span>
      );
    }

    return (
      <div className="flex max-w-[176px] flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge
            key={tag.key}
            variant="outline"
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 py-0 text-[10px] font-medium shadow-none",
              tag.badgeClassName,
            )}
          >
            {t(`battlePanel.list.damageTags.${tag.key}`)}
          </Badge>
        ))}
      </div>
    );
  };

  const columns: ColumnDef<Battle>[] = [
    {
      id: "select",
      header: () => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={headerCheckboxState}
            aria-label={t("battlePanel.bulk.selectRows")}
            onCheckedChange={(checked) =>
              handleHeaderSelectionChange(checked === true)
            }
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          data-battle-table-action
          className="flex items-center justify-center"
          onClick={stopTableAction}
          onKeyDown={stopTableKeyboardAction}
        >
          <Checkbox
            checked={selectedBattleIds.has(row.original.id)}
            aria-label={t("battlePanel.bulk.selectRow")}
            onCheckedChange={(checked) =>
              handleSelectionChange(row.original.id, checked === true)
            }
          />
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "leftTeam",
      header: t("battlePanel.list.columns.yourTeam"),
      cell: ({ row }) => {
        const { leftTeam, userWarrior } = getBattleTeams(row.original);

        return renderTeam(leftTeam, userWarrior);
      },
      enableSorting: false,
    },
    {
      id: "rightTeam",
      header: t("battlePanel.list.columns.opponents"),
      cell: ({ row }) => {
        const { rightTeam } = getBattleTeams(row.original);

        return renderTeam(rightTeam);
      },
      enableSorting: false,
    },
    {
      id: "world",
      header: t("battlePanel.list.columns.world"),
      cell: ({ row }) => {
        const battle = row.original;

        return (
          <button
            type="button"
            data-battle-table-action
            onClick={(event) => handleWorldBadgeClick(event, battle.world)}
            onKeyDown={stopTableKeyboardAction}
            className="inline-flex max-w-[108px] items-center truncate rounded-md border border-foreground/30 bg-background/40 px-2 py-0 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-background/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {capitalizeFirstLetter(battle.world)}
          </button>
        );
      },
      enableSorting: false,
    },
    {
      id: "tags",
      header: t("battlePanel.list.columns.tags"),
      cell: ({ row }) => {
        const { leftTeam, rightTeam } = getBattleTeams(row.original);

        return renderDamageTags(leftTeam, rightTeam);
      },
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
      id: "mode",
      header: () => (
        <div className="text-center">{t("battlePanel.list.columns.mode")}</div>
      ),
      cell: ({ row }) => {
        const battle = row.original;
        const userWarrior = battle.warriors.find(
          (warrior) => warrior.originalId === battle.characterId,
        );
        const visibilityLabel = battle.public
          ? t("battleUi.metadata.public")
          : t("battleUi.metadata.private");

        return (
          <div className="flex min-w-[72px] flex-wrap items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
                  aria-label={visibilityLabel}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground"
                >
                  {battle.public ? (
                    <LockOpen className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>{visibilityLabel}</TooltipContent>
            </Tooltip>
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
                    className="cursor-pointer rounded-md border-foreground/40 px-1.5 py-0 text-[10px]"
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
                      handleFilterBadgeKeyDown(event, () =>
                        onMatchmakingClick?.(),
                      )
                    }
                    role="button"
                    tabIndex={0}
                    variant="outline"
                    className="cursor-pointer rounded-md border-purple-500/50 bg-purple-500/10 px-1.5 py-0 text-[10px] text-purple-500 hover:bg-purple-500/20"
                  >
                    {t("battlePanel.bulk.matchmakingShort")}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t("battlePanel.filters.matchmaking")}
                </TooltipContent>
              </Tooltip>
            )}
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
      cell: ({ row }) => {
        const battle = row.original;

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
                    <DropdownMenuItem
                      onSelect={() => handleCopyLink(battle.id)}
                    >
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
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: battles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Card
        className={cn(
          "min-h-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm gap-0",
          showPagination ? "flex h-full flex-1 flex-col" : "flex flex-col",
        )}
      >
        <div className="grid shrink-0 gap-2 border-b border-border bg-background/80 px-3 py-3 md:min-h-[64px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-2">{toolbar}</div>
          <div
            className={cn(
              "flex min-h-8 flex-wrap items-center justify-end gap-2",
              !toolbarEnd && "hidden md:flex",
            )}
          >
            <div
              aria-hidden={!hasSelectedBattles}
              className={cn(
                "flex flex-wrap items-center justify-end gap-2",
                !hasSelectedBattles && "invisible pointer-events-none",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {t("battlePanel.bulk.selected", {
                  count: selectedBattles.length,
                })}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleBulkShare}
                disabled={!hasSelectedBattles || isBulkBusy}
              >
                <Share2 className="size-3.5" />
                {t("battlePanel.bulk.share")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                disabled={!hasSelectedBattles || isBulkBusy}
              >
                <Trash2 className="size-3.5" />
                {t("battlePanel.bulk.delete")}
              </Button>
            </div>
            {toolbarEnd}
          </div>
        </div>

        <ScrollArea
          className={cn("relative w-full", showPagination && "flex-1 min-h-0")}
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
          ) : (
            <Table className="min-w-full table-fixed border-b md:min-w-[840px] md:table-auto">
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
                      "ring-1 ring-inset ring-primary/30",
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
                      event.target instanceof Element &&
                      event.target.closest("[data-battle-table-action]")
                    ) {
                      return;
                    }

                    handleRowKeyDown(event, row.original.id);
                  },
                })}
              />
            </Table>
          )}
        </ScrollArea>

        {showPagination && (
          <TablePaginationFooter
            totalLabel={t("battlePanel.list.totalBattles", {
              count: totalCount,
            })}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPreviousPage={onPreviousPage ?? (() => undefined)}
            onNextPage={onNextPage ?? (() => undefined)}
          />
        )}
      </Card>

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
