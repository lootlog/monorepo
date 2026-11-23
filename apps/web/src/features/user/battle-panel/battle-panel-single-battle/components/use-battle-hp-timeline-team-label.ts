import { getBattleHpTimelinePlayerTeam } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-colors";
import { isBattleHpTimelineGroupBattle } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-group-series";
import { getBattleHpTimelineTeamLabel } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-labels";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
import { useTranslation } from "react-i18next";

export function useBattleHpTimelineTeamLabel(
  warriors: BattleTimelineResponseDtoOutput["warriors"],
  characterId: string | null,
) {
  const { t } = useTranslation();
  const playerTeam = getBattleHpTimelinePlayerTeam(warriors, characterId);

  return (team: number) => {
    const fallback = t("battlePanel.single.chart.team", { team });

    if (!isBattleHpTimelineGroupBattle(warriors)) {
      return getBattleHpTimelineTeamLabel(warriors, team, fallback);
    }

    if (playerTeam === null) {
      return fallback;
    }

    return team === playerTeam
      ? t("battlePanel.single.chart.group.ownTeam")
      : t("battlePanel.single.chart.group.opponents");
  };
}
