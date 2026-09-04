import { Card } from "@lootlog/ui/components/card";
import { cn } from "cn";
import { Flag, Trophy, type LucideIcon } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { Battle } from "@/lib/api/battlelog-types";
import {
  BATTLE_BADGE_COLORS,
  BATTLE_SURFACE_COLORS,
} from "./utils/battle-color-palette";
import { BattleCompactTeam } from "./battle-compact-team";
import { BattleMetadata } from "./battle-metadata";
import { getBattleTeamPresentation } from "./utils/battle-team-presentation";

export type BattleCompactOverviewCardProps = {
  battle: Battle;
  cdnBaseUrl: string;
  currentUserCharacterId?: string;
};

type BattleWinnerResult = "flee" | "won";

const RESULT_ICON_BY_TYPE: Record<BattleWinnerResult, LucideIcon> = {
  flee: Flag,
  won: Trophy,
};

const RESULT_CLASS_NAME_BY_TYPE: Record<BattleWinnerResult, string> = {
  flee: BATTLE_BADGE_COLORS.result.flee,
  won: BATTLE_BADGE_COLORS.result.won,
};

const getWinnerResult = (battle: Battle): BattleWinnerResult =>
  battle.hasFlee ? "flee" : "won";

export const BattleCompactOverviewCard: FC<BattleCompactOverviewCardProps> = ({
  battle,
  cdnBaseUrl,
  currentUserCharacterId,
}) => {
  const { t } = useTranslation();
  const { characterId, leftTeam, rightTeam, leftTeamNumber, rightTeamNumber } =
    getBattleTeamPresentation(battle, currentUserCharacterId);
  const winnerResult = getWinnerResult(battle);
  const isLeftTeamWinner = battle.winningTeam === leftTeamNumber;
  const isRightTeamWinner = battle.winningTeam === rightTeamNumber;
  const ResultIcon = RESULT_ICON_BY_TYPE[winnerResult];
  const winnerResultLabel = t(`battlePanel.list.results.${winnerResult}`);
  const winnerBadgeClassName = cn(
    "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-[10px] font-semibold leading-none",
    RESULT_CLASS_NAME_BY_TYPE[winnerResult],
  );

  return (
    <Card className="w-full gap-0 overflow-hidden border-border bg-card p-0">
      <div
        className={cn(BATTLE_SURFACE_COLORS.overview.teamGradient, "px-3 py-3")}
      >
        <div className="grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <BattleCompactTeam
            cdnBaseUrl={cdnBaseUrl}
            characterId={characterId}
            isUserTeam
            label={t("battleUi.team.userTeam")}
            opposingTeam={rightTeam}
            team={leftTeam}
          />

          <div className="flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {isLeftTeamWinner && (
                <span
                  className={cn(
                    winnerBadgeClassName,
                    "absolute right-full top-1/2 mr-1.5 -translate-y-1/2",
                  )}
                >
                  <ResultIcon className="size-3" aria-hidden />
                  {winnerResultLabel}
                </span>
              )}
              <div className="rounded-sm border border-border/80 bg-background/55 px-2 py-1 text-xs font-semibold leading-none text-foreground shadow-sm">
                {t("battleUi.overview.vs")}
              </div>
              {isRightTeamWinner && (
                <span
                  className={cn(
                    winnerBadgeClassName,
                    "absolute left-full top-1/2 ml-1.5 -translate-y-1/2",
                  )}
                >
                  <ResultIcon className="size-3" aria-hidden />
                  {winnerResultLabel}
                </span>
              )}
            </div>
          </div>

          <BattleCompactTeam
            align="end"
            cdnBaseUrl={cdnBaseUrl}
            characterId={characterId}
            isUserTeam={false}
            label={t("battleUi.team.enemyTeam")}
            opposingTeam={leftTeam}
            team={rightTeam}
          />
        </div>

        <BattleMetadata
          battle={battle}
          align="left"
          className="mt-2 gap-x-3 gap-y-1 border-t border-border/60 p-0 pt-2 text-[11px]"
        />
      </div>
    </Card>
  );
};
