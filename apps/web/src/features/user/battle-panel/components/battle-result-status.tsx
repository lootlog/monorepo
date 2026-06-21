import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  BATTLE_BADGE_COLORS,
  BATTLE_SURFACE_COLORS,
} from "@/components/battle/utils/battle-color-palette";
import { cn } from "@lootlog/ui/lib/utils";
import { Flag, Trophy, XCircle, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export type BattleResultStatusValue = "flee" | "lost" | "won";

type BattleResultStatusProps = {
  className?: string;
  result?: BattleResultStatusValue | null;
  showLabel?: boolean;
};

const BATTLE_RESULT_STATUS_CONFIG: Record<
  BattleResultStatusValue,
  {
    className: string;
    icon: LucideIcon;
    labelKey: string;
  }
> = {
  won: {
    className: BATTLE_BADGE_COLORS.result.won,
    icon: Trophy,
    labelKey: "battlePanel.list.results.won",
  },
  lost: {
    className: BATTLE_BADGE_COLORS.result.lost,
    icon: XCircle,
    labelKey: "battlePanel.list.results.lost",
  },
  flee: {
    className: BATTLE_BADGE_COLORS.result.flee,
    icon: Flag,
    labelKey: "battlePanel.list.results.flee",
  },
};

export const getBattleResultRowClassName = (
  result?: BattleResultStatusValue | null,
) => {
  if (result === "won") {
    return BATTLE_SURFACE_COLORS.resultRow.won;
  }

  if (result === "lost") {
    return BATTLE_SURFACE_COLORS.resultRow.lost;
  }

  if (result !== "flee") {
    return BATTLE_SURFACE_COLORS.resultRow.unknown;
  }

  return BATTLE_SURFACE_COLORS.resultRow.flee;
};

const isBattleResultStatusValue = (
  result: BattleResultStatusProps["result"],
): result is BattleResultStatusValue =>
  result !== null &&
  result !== undefined &&
  Object.prototype.hasOwnProperty.call(BATTLE_RESULT_STATUS_CONFIG, result);

export function BattleResultStatus({
  className,
  result,
  showLabel = false,
}: BattleResultStatusProps) {
  const { t } = useTranslation();

  if (!isBattleResultStatusValue(result)) {
    return null;
  }

  const resultConfig = BATTLE_RESULT_STATUS_CONFIG[result];
  const ResultIcon = resultConfig.icon;
  const resultLabel = t(resultConfig.labelKey);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={resultLabel}
          className={cn(
            "inline-flex min-h-6 items-center justify-center gap-1 rounded-md border px-1.5 text-xs font-semibold leading-none",
            !showLabel && "size-6 min-w-6 p-0",
            resultConfig.className,
            className,
          )}
        >
          <ResultIcon className="size-3.5" aria-hidden="true" />
          {showLabel && <span>{resultLabel}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>{resultLabel}</TooltipContent>
    </Tooltip>
  );
}
