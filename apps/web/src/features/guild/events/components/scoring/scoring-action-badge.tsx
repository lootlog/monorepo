import { useTranslation } from "react-i18next";
import type { EventScoringAction } from "@lootlog/domain/scoring";
import { Badge } from "@lootlog/ui/components/badge";
import { formatScoringAction } from "../../utils/scoring-rule-labels";
import {
  SCORING_ACTION_TONE,
  SCORING_TONE_BADGE_VARIANT,
} from "../../utils/scoring-tone";

export const ScoringActionBadge = ({
  action,
  muted = false,
}: {
  action: EventScoringAction;
  muted?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <Badge
      variant={
        muted
          ? "secondary"
          : SCORING_TONE_BADGE_VARIANT[SCORING_ACTION_TONE[action.type]]
      }
      size="sm"
      className="shrink-0 whitespace-nowrap tabular-nums"
    >
      {formatScoringAction(action, t)}
    </Badge>
  );
};
