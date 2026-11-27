import type {
  BingoBoardDetailResponseDtoMemberProgressItem,
  BingoBoardDetailResponseDtoTilesItem,
  BingoBoardSummaryResponseDtoMode,
} from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "cn";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Crown,
  Flame,
  Hand,
  Lock,
  Plus,
  Radar,
  Skull,
  Sparkles,
  Swords,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBingoConditionSummary } from "./bingo-condition-summary";

type ConditionKind = BingoBoardDetailResponseDtoTilesItem["conditionKind"];

const CONDITION_ICON = {
  LOOT: Sparkles,
  KILL: Skull,
  HERO_SIGHTING: Radar,
  BATTLE: Swords,
  MANUAL: Hand,
} as const satisfies Record<ConditionKind, typeof Sparkles>;

type BingoBoardCellProps = {
  readonly row: number;
  readonly col: number;
  readonly tile: BingoBoardDetailResponseDtoTilesItem | null;
  readonly mode: BingoBoardSummaryResponseDtoMode;
  readonly pointsPerTile: number;
  readonly selectedMemberId: number;
  readonly progress: BingoBoardDetailResponseDtoMemberProgressItem | null;
  readonly editable: boolean;
  readonly isSelected: boolean;
  readonly isInCompletedLine: boolean;
  readonly onSelectCell?: (
    row: number,
    col: number,
    tile: BingoBoardDetailResponseDtoTilesItem | null,
  ) => void;
};

const computeTileViewState = (
  tile: BingoBoardDetailResponseDtoTilesItem,
  options: {
    readonly mode: BingoBoardSummaryResponseDtoMode;
    readonly pointsPerTile: number;
    readonly selectedMemberId: number;
    readonly progress: BingoBoardDetailResponseDtoMemberProgressItem | null;
    readonly editable: boolean;
    readonly isInCompletedLine: boolean;
    readonly t: TFunction;
  },
) => {
  const {
    mode,
    pointsPerTile,
    selectedMemberId,
    progress,
    editable,
    isInCompletedLine,
    t,
  } = options;

  const targetCount = tile.condition.targetCount;
  const currentCount = progress?.currentCount ?? 0;

  const isLockedByOther =
    mode === "LOCKOUT" &&
    tile.lockedByMemberId !== null &&
    tile.lockedByMemberId !== selectedMemberId;

  const isCompletedBySelected =
    progress !== null && progress.completedAt !== null && !isLockedByOther;

  const percent =
    targetCount > 0
      ? Math.min(100, Math.round((currentCount / targetCount) * 100))
      : 0;

  const isStreak =
    tile.condition.kind === "BATTLE" && tile.condition.metric === "WIN_STREAK";

  const progressLabel = isCompletedBySelected
    ? t("bingo.board.completed")
    : isStreak
      ? t("bingo.board.streak", { current: currentCount, target: targetCount })
      : t("bingo.board.progress", {
          current: currentCount,
          target: targetCount,
        });

  const cardClass =
    !editable && isInCompletedLine && isCompletedBySelected
      ? "border-emerald-500/80 bg-emerald-500/15"
      : isCompletedBySelected
        ? "border-emerald-500/50 bg-emerald-500/10"
        : isLockedByOther
          ? "border-border/50 bg-muted/40 opacity-70"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/30";

  return {
    isLockedByOther,
    isCompletedBySelected,
    isStreak,
    progressLabel,
    cardClass,
    tilePoints: tile.points ?? pointsPerTile,
    fillWidth: isCompletedBySelected ? 100 : percent,
  };
};

export const BingoBoardCell = ({
  row,
  col,
  tile,
  mode,
  pointsPerTile,
  selectedMemberId,
  progress,
  editable,
  isSelected,
  isInCompletedLine,
  onSelectCell,
}: BingoBoardCellProps) => {
  const { t } = useTranslation();

  if (!tile) {
    return (
      <button
        type="button"
        disabled={!onSelectCell}
        onClick={() => onSelectCell?.(row, col, null)}
        className={cn(
          "flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-center transition-colors",
          onSelectCell &&
            "cursor-pointer hover:border-primary/60 hover:bg-muted/40",
          isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
        )}
      >
        {editable ? <Plus className="size-4 text-muted-foreground" /> : null}
        <span className="text-xs font-medium text-muted-foreground">
          {editable
            ? t("bingo.board.clickToConfigure")
            : t("bingo.board.emptyCell")}
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          R{row + 1} · C{col + 1}
        </span>
      </button>
    );
  }

  const Icon = CONDITION_ICON[tile.conditionKind];

  const view = computeTileViewState(tile, {
    mode,
    pointsPerTile,
    selectedMemberId,
    progress,
    editable,
    isInCompletedLine,
    t,
  });

  return (
    <button
      type="button"
      disabled={!onSelectCell}
      onClick={() => onSelectCell?.(row, col, tile)}
      className={cn(
        "group relative flex min-h-32 flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
        onSelectCell && "cursor-pointer",
        view.cardClass,
        isSelected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Icon className="size-3.5 shrink-0" />
          <span>{t(`bingo.conditionKind.${tile.conditionKind}`)}</span>
        </span>
        <div className="flex items-center gap-1">
          {view.isCompletedBySelected ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : view.isLockedByOther ? (
            <Lock className="size-3.5 text-muted-foreground" />
          ) : null}
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {view.tilePoints} pkt
          </Badge>
        </div>
      </div>

      <div className="space-y-1">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {tile.title}
        </div>
        <div className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
          {formatBingoConditionSummary(tile.condition, t)}
        </div>
      </div>

      {editable ? (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            R{row + 1} · C{col + 1}
          </span>
          <span>{t("bingo.board.clickToConfigure")}</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {view.isStreak ? (
                <Flame className="size-3 text-amber-500" />
              ) : null}
              {view.progressLabel}
            </span>
            {tile.lockedByMember ? (
              <span className="inline-flex max-w-[110px] items-center gap-1 truncate text-[10px] text-muted-foreground">
                <Crown className="size-3 shrink-0 text-amber-500" />
                <span className="truncate">{tile.lockedByMember.name}</span>
              </span>
            ) : null}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                view.isCompletedBySelected ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${view.fillWidth}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
};
