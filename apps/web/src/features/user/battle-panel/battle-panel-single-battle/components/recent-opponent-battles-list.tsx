import {
  BattleResultStatus,
  getBattleResultRowClassName,
  type BattleResultStatusValue,
} from "@/features/user/battle-panel/components/battle-result-status";
import type { Battle, PlayerVsPlayerBattle } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { RecentOpponentBattleWarrior } from "./recent-opponent-battle-warrior";
import { useRecentOpponentBattles } from "../hooks/use-recent-opponent-battles";

type RecentOpponentBattlesListProps = {
  battle: Battle | undefined;
  className?: string;
};

const getRecentBattleResult = (
  battle: PlayerVsPlayerBattle,
): BattleResultStatusValue => {
  if (battle.hasFlee) {
    return "flee";
  }

  if (battle.userWarrior.name === battle.winner) {
    return "won";
  }

  return "lost";
};

export function RecentOpponentBattlesList({
  battle,
  className,
}: RecentOpponentBattlesListProps) {
  const { t } = useTranslation();
  const { battleDetailsById, battles, context, isError, isLoading } =
    useRecentOpponentBattles(battle);

  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className="divide-y divide-border/70">
        {!context ? (
          <div className="m-3 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.unsupportedDescription")}
          </div>
        ) : isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid min-h-10 grid-cols-[32px_minmax(0,1fr)_68px] items-center gap-2 px-2.5 py-1"
            >
              <Skeleton className="size-6 rounded-md" />
              <div className="flex min-w-0 items-center gap-3.5">
                <Skeleton className="h-7 w-20 max-w-[calc(50%-0.4375rem)] rounded-md" />
                <Skeleton className="h-7 w-20 max-w-[calc(50%-0.4375rem)] rounded-md" />
              </div>
              <Skeleton className="h-4 rounded-md" />
            </div>
          ))
        ) : isError ? (
          <div className="m-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t("battlePanel.single.recentOpponent.error")}
          </div>
        ) : battles.length === 0 ? (
          <div className="m-3 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.empty")}
          </div>
        ) : (
          battles.map((recentBattle) => {
            const result = getRecentBattleResult(recentBattle);
            const exactTime = format(
              new Date(recentBattle.createdAt),
              "dd.MM.yyyy HH:mm",
            );
            const relativeTime = getRelativeTime(recentBattle.createdAt);
            const battleDetails = battleDetailsById[recentBattle.battleId];
            const detailedOpponentWarrior = battleDetails?.warriors.find(
              (warrior) => warrior.originalId === context.opponentId,
            );
            const detailedUserWarrior = battleDetails?.warriors.find(
              (warrior) => warrior.originalId === context.characterId,
            );
            const opponentWarriorForTags =
              detailedOpponentWarrior ?? recentBattle.opponentWarrior;
            const userWarriorForTags =
              detailedUserWarrior ?? recentBattle.userWarrior;

            return (
              <Link
                key={recentBattle.battleId}
                to="/@me/battle-panel/battles/$battleId"
                params={{ battleId: recentBattle.battleId }}
                preload={false}
                className={cn(
                  "grid min-h-10 grid-cols-[32px_minmax(0,1fr)_68px] items-center gap-1 px-2.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                  getBattleResultRowClassName(result),
                )}
              >
                <BattleResultStatus result={result} />
                <div className="flex min-w-0 items-center gap-3.5">
                  <RecentOpponentBattleWarrior
                    warrior={userWarriorForTags}
                    opposingWarrior={opponentWarriorForTags}
                    className="max-w-[calc(50%-0.4375rem)]"
                  />
                  <RecentOpponentBattleWarrior
                    warrior={opponentWarriorForTags}
                    opposingWarrior={userWarriorForTags}
                    className="max-w-[calc(50%-0.4375rem)]"
                  />
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block whitespace-normal break-words text-right text-[11px] leading-snug text-muted-foreground">
                        {relativeTime}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{exactTime}</TooltipContent>
                  </Tooltip>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
