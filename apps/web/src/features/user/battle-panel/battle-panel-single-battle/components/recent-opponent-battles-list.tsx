import { EmptyState } from "@/components/common/empty-state";
import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";
import { getPlayerVsPlayerBattleResult } from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelPvpWarriorSummary } from "@/features/user/battle-panel/components/battle-panel-pvp-warrior-summary";
import type { Battle } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { Link } from "@tanstack/react-router";
import { CircleAlert, History, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBattleSwitch } from "../hooks/use-battle-switch";
import { useRecentOpponentBattles } from "../hooks/use-recent-opponent-battles";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

type RecentOpponentBattlesListProps = {
  battle: Battle | undefined;
  className?: string;
};

export function RecentOpponentBattlesList({
  battle,
  className,
}: RecentOpponentBattlesListProps) {
  const { t } = useTranslation();

  const {
    battleDetailsById,
    battles,
    context,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useRecentOpponentBattles(battle);

  const { pendingBattleId, prefetchBattle, openBattle } = useBattleSwitch();

  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className="divide-y divide-sidebar-border border-b border-sidebar-border">
        {!context ? (
          <EmptyState
            compact
            icon={History}
            title={t("battlePanel.single.recentOpponent.unsupported")}
            description={t(
              "battlePanel.single.recentOpponent.unsupportedDescription",
            )}
          />
        ) : isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid h-14 grid-cols-[32px_minmax(0,1fr)_76px] items-center gap-2 px-3 sm:px-4"
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
          <EmptyState
            compact
            icon={CircleAlert}
            title={t("battlePanel.single.recentOpponent.error")}
            action={
              <Button
                type="button"
                variant="outline"
                loading={isFetching}
                icon=<RotateCcw className="size-3.5" />
                onClick={() => void refetch()}
              >
                {t("common.actions.retry")}
              </Button>
            }
          />
        ) : battles.length === 0 ? (
          <EmptyState
            compact
            icon={History}
            title={t("battlePanel.single.recentOpponent.empty")}
          />
        ) : (
          battles.map((recentBattle) => {
            const result = getPlayerVsPlayerBattleResult(recentBattle);

            const exactTime = timestampToDate(recentBattle.createdAt);

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
            const isPending = recentBattle.battleId === pendingBattleId;

            return (
              <Link
                key={recentBattle.battleId}
                to="/@me/battle-panel/battles/$battleId"
                params={{ battleId: recentBattle.battleId }}
                preload={false}
                aria-current={isCurrentBattle ? "page" : undefined}
                aria-busy={isPending || undefined}
                onPointerEnter={() => prefetchBattle(recentBattle.battleId)}
                onFocus={() => prefetchBattle(recentBattle.battleId)}
                onClick={(event) =>
                  void openBattle(event, recentBattle.battleId)
                }
                className={cn(
                  "grid h-14 grid-cols-[32px_minmax(0,1fr)_76px] items-center gap-1 px-3 text-left sm:px-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                  isCurrentBattle &&
                    "relative z-10 bg-primary/10 ring-1 ring-inset ring-primary/45",
                  isPending && "bg-muted/40",
                )}
              >
                {/* The battle loads before the page switches to it. */}
                {isPending ? (
                  <Spinner className="mx-1 size-4 text-muted-foreground" />
                ) : (
                  <BattleResultStatus result={result} />
                )}
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
                    <span className="max-w-full truncate rounded-sm border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-xs font-medium leading-none text-primary">
                      {t("battlePanel.single.recentOpponent.current")}
                    </span>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="block whitespace-normal break-words text-right text-xs leading-snug text-muted-foreground">
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
