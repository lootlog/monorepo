import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
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
    className: "border-green-500/25 bg-green-500/10 text-green-400",
    icon: Trophy,
    labelKey: "battlePanel.list.results.won",
  },
  lost: {
    className: "border-red-500/25 bg-red-500/10 text-red-400",
    icon: XCircle,
    labelKey: "battlePanel.list.results.lost",
  },
  flee: {
    className: "border-yellow-500/25 bg-yellow-500/10 text-yellow-400",
    icon: Flag,
    labelKey: "battlePanel.list.results.flee",
  },
};

export const getBattleResultRowClassName = (
  result?: BattleResultStatusValue | null,
) => {
  if (result === "won") {
    return "bg-green-500/5 hover:bg-green-500/10";
  }

  if (result === "lost") {
    return "bg-red-500/5 hover:bg-red-500/10";
  }

  if (result !== "flee") {
    return "bg-background/30 hover:bg-muted/50";
  }

  return "bg-yellow-500/5 hover:bg-yellow-500/10";
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
