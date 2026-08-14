import {
  BattleResultStatus,
  getBattleResultRowClassName,
} from "@/features/user/battle-panel/components/battle-result-status";
import { getPlayerVsPlayerBattleResult } from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelPvpWarriorSummary } from "@/features/user/battle-panel/components/battle-panel-pvp-warrior-summary";
import type { Battle } from "@/lib/api/battlelog-types";
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
import { useRecentOpponentBattles } from "../hooks/use-recent-opponent-battles";

type RecentOpponentBattlesListProps = {
  battle: Battle | undefined;
  className?: string;
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
              className="grid h-14 grid-cols-[32px_minmax(0,1fr)_76px] items-center gap-2 px-2.5"
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
            const result = getPlayerVsPlayerBattleResult(recentBattle);
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
            const isCurrentBattle = recentBattle.battleId === battle?.id;

            return (
              <Link
                key={recentBattle.battleId}
                to="/@me/battle-panel/battles/$battleId"
                params={{ battleId: recentBattle.battleId }}
                preload={false}
                aria-current={isCurrentBattle ? "page" : undefined}
                className={cn(
                  "grid h-14 grid-cols-[32px_minmax(0,1fr)_76px] items-center gap-1 px-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                  getBattleResultRowClassName(result),
                  isCurrentBattle &&
                    "relative z-10 bg-primary/10 ring-1 ring-inset ring-primary/45",
                )}
              >
                <BattleResultStatus result={result} />
                <div className="flex min-w-0 items-center gap-3.5 overflow-hidden">
                  <BattlePanelPvpWarriorSummary
                    warrior={userWarriorForTags}
                    opposingWarrior={opponentWarriorForTags}
                    className="max-w-[calc(50%-0.4375rem)]"
                  />
                  <BattlePanelPvpWarriorSummary
                    warrior={opponentWarriorForTags}
                    opposingWarrior={userWarriorForTags}
                    className="max-w-[calc(50%-0.4375rem)]"
                  />
                </div>
                <div className="flex min-w-0 flex-col items-end gap-0.5">
                  {isCurrentBattle ? (
                    <span className="max-w-full truncate rounded-sm border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary">
                      {t("battlePanel.single.recentOpponent.current")}
                    </span>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="block whitespace-normal break-words text-right text-[11px] leading-snug text-muted-foreground">
                          {relativeTime}
                        </span>
                      }
                    />
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
