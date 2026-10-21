import { useTranslation } from "react-i18next";
import type { EventScoringAction } from "@lootlog/domain/scoring";
import { cn } from "cn";
import { formatScoringAction } from "../../utils/scoring-rule-labels";

const ACTION_CLASS_NAMES: Record<EventScoringAction["type"], string> = {
  SET_BASE: "bg-primary/10 text-primary",
  ADD_BONUS: "bg-cyan-400/10 text-cyan-400",
  ZERO_BASE: "bg-amber-400/10 text-amber-400",
};

/** What a rule does to the points: "3 pkt", "+0,5 pkt" or "Zeruj punkty". */
export const ScoringActionBadge = ({
  action,
  muted = false,
}: {
  action: EventScoringAction;
  muted?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums",
        muted
          ? "bg-muted/40 text-muted-foreground"
          : ACTION_CLASS_NAMES[action.type],
      )}
    >
      {formatScoringAction(action, t)}
    </span>
  );
};
