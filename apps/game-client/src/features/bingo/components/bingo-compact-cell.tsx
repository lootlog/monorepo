import type {
  BingoBoardDetailResponseDtoTilesItem,
  BingoBoardSummaryResponseDtoMode,
} from "@lootlog/client/main";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { Check, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

type BingoCompactCellProps = {
  readonly tile: BingoBoardDetailResponseDtoTilesItem | null;
  readonly mode: BingoBoardSummaryResponseDtoMode;
  readonly viewerMemberId: number;
  readonly inCompletedLine: boolean;
};

const getCompactCellClass = (state: {
  readonly inLine: boolean;
  readonly isCompleted: boolean;
  readonly isLockedByOther: boolean;
}) => {
  if (state.inLine) {
    return "ll:border-emerald-400/80 ll:bg-emerald-500/25 ll:text-emerald-100";
  }

  if (state.isCompleted) {
    return "ll:border-emerald-500/50 ll:bg-emerald-500/15 ll:text-emerald-100";
  }

  if (state.isLockedByOther) {
    return "ll:border-white/10 ll:bg-white/5 ll:text-white/40";
  }

  return "ll:border-white/15 ll:bg-black/35 ll:text-white/90";
};

export const BingoCompactCell = ({
  tile,
  mode,
  viewerMemberId,
  inCompletedLine,
}: BingoCompactCellProps) => {
  const { t } = useTranslation("bingo");

  if (!tile) {
    return (
      <div className="ll:flex ll:h-12 ll:items-center ll:justify-center ll:rounded ll:border ll:border-dashed ll:border-white/10 ll:bg-black/20 ll:text-[9px] ll:text-white/30">
        {t("tile.empty")}
      </div>
    );
  }

  const progress = tile.viewerProgress;
  const targetCount = tile.condition.targetCount;
  const currentCount = progress?.currentCount ?? 0;

  const isLockedByOther =
    mode === "LOCKOUT" &&
    tile.lockedByMemberId !== null &&
    tile.lockedByMemberId !== viewerMemberId;

  const isCompleted =
    progress !== null && progress.completedAt !== null && !isLockedByOther;

  const percent =
    targetCount > 0
      ? Math.min(100, Math.round((currentCount / targetCount) * 100))
      : 0;

  const tooltipStatus = isCompleted
    ? t("tile.completed")
    : isLockedByOther && tile.lockedByMember
      ? t("tile.lockedBy", { name: tile.lockedByMember.name })
      : t("tile.progress", { current: currentCount, target: targetCount });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "ll:relative ll:flex ll:h-12 ll:flex-col ll:justify-between ll:overflow-hidden ll:rounded ll:border ll:p-1 ll:text-[9px] ll:leading-tight",
            getCompactCellClass({
              inLine: isCompleted && inCompletedLine,
              isCompleted,
              isLockedByOther,
            }),
          )}
        >
          <span className="ll:line-clamp-2 ll:font-medium">{tile.title}</span>
          <div className="ll:flex ll:items-center ll:justify-between ll:gap-0.5 ll:text-[8px]">
            {isCompleted ? (
              <span className="ll:inline-flex ll:items-center ll:gap-0.5 ll:font-semibold ll:text-emerald-300">
                <Check className="ll:size-2.5" aria-hidden="true" />
                {t("tile.completed")}
              </span>
            ) : isLockedByOther ? (
              <Lock
                className="ll:size-2.5 ll:text-white/40"
                aria-hidden="true"
              />
            ) : (
              <span className="ll:tabular-nums ll:text-white/70">
                {t("tile.progress", {
                  current: currentCount,
                  target: targetCount,
                })}
              </span>
            )}
          </div>
          {!isCompleted && !isLockedByOther && percent > 0 ? (
            <div className="ll:absolute ll:inset-x-0 ll:bottom-0 ll:h-0.5 ll:bg-white/10">
              <div
                className="ll:h-full ll:bg-sky-400"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent className="ll:max-w-[220px] ll:space-y-1 ll:text-xs">
        <div className="ll:font-semibold">{tile.title}</div>
        {tile.description ? (
          <div className="ll:text-[11px] ll:opacity-80">{tile.description}</div>
        ) : null}
        <div className="ll:text-[11px]">{tooltipStatus}</div>
      </TooltipContent>
    </Tooltip>
  );
};
