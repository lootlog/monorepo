import { PlayerTile } from "@/components/battle";
import type { Battle, PlayerVsPlayerBattle } from "@/lib/api/battlelog-types";
import { battlesControllerGetPlayerVsPlayerBattles } from "@/lib/api/generated/battlelog/battles/battles";
import { getProfessionName } from "@/lib/utils/professions";
import { Badge } from "@lootlog/ui/components/badge";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Clock, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getRecentOpponentBattleContext } from "./recent-opponent-battle-context";

type RecentOpponentBattlesListProps = {
  battle: Battle | undefined;
  className?: string;
};

const getBattleResult = (battle: PlayerVsPlayerBattle) =>
  battle.userWarrior.name === battle.winner ? "win" : "loss";

export function RecentOpponentBattlesList({
  battle,
  className,
}: RecentOpponentBattlesListProps) {
  const { t } = useTranslation();
  const context = getRecentOpponentBattleContext(battle);
  const { data, isError, isLoading } = useQuery({
    queryKey: [
      "recent-opponent-battles",
      context?.battleId,
      context?.characterId,
      context?.opponentId,
      context?.world,
    ],
    queryFn: () => {
      if (!context) {
        throw new Error("Missing recent opponent context");
      }

      return battlesControllerGetPlayerVsPlayerBattles({
        characterId: context.characterId,
        excludeBattleId: context.battleId,
        opponentId: context.opponentId,
        period: "all",
        size: 10,
        world: context.world,
      });
    },
    enabled: context !== null,
  });
  const battles = data?.battles ?? [];

  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className="space-y-2 p-3">
        {!context ? (
          <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.unsupportedDescription")}
          </div>
        ) : isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-md border border-border bg-muted/40"
            />
          ))
        ) : isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t("battlePanel.single.recentOpponent.error")}
          </div>
        ) : battles.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.empty")}
          </div>
        ) : (
          battles.map((recentBattle) => {
            const result = getBattleResult(recentBattle);
            const ratingDelta = recentBattle.ratingDelta;
            const ratingDeltaLabel =
              ratingDelta > 0 ? `+${ratingDelta}` : String(ratingDelta);

            return (
              <Link
                key={recentBattle.battleId}
                to="/@me/battle-panel/battles/$battleId"
                params={{ battleId: recentBattle.battleId }}
                className="group block rounded-md border border-border bg-background p-2 transition-colors hover:border-primary/60 hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <PlayerTile
                    player={{
                      icon: recentBattle.opponentWarrior.icon,
                      lvl: recentBattle.opponentWarrior.lvl,
                      name: recentBattle.opponentWarrior.name,
                      prof: recentBattle.opponentWarrior.prof,
                    }}
                    className="scale-75"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {recentBattle.opponentWarrior.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 shrink-0 px-1.5 text-[10px]",
                          result === "win"
                            ? "border-green-400/50 text-green-400"
                            : "border-red-400/50 text-red-400",
                        )}
                      >
                        {t(`battlePanel.single.recentOpponent.${result}`)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        {recentBattle.opponentWarrior.lvl}
                        {recentBattle.opponentWarrior.prof}
                      </span>
                      <span>
                        {getProfessionName(recentBattle.opponentWarrior.prof)}
                      </span>
                      <span>{context.world}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {format(new Date(recentBattle.createdAt), "dd.MM HH:mm", {
                      locale: pl,
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {t("battlePanel.single.recentOpponent.durationSeconds", {
                      seconds: Math.floor(recentBattle.duration),
                    })}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1 font-semibold tabular-nums",
                      ratingDelta > 0 && "text-green-400",
                      ratingDelta < 0 && "text-red-400",
                    )}
                  >
                    <Trophy className="size-3" />
                    {ratingDeltaLabel}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
