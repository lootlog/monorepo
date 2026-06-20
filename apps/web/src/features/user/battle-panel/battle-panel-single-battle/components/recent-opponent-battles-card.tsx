import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { ArrowUpRight, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { getRecentOpponentBattleContext } from "./recent-opponent-battle-context";
import { RecentOpponentBattlesList } from "./recent-opponent-battles-list";

type RecentOpponentBattlesCardProps = {
  battle: Battle | undefined;
  className?: string;
};

export function RecentOpponentBattlesCard({
  battle,
  className,
}: RecentOpponentBattlesCardProps) {
  const { t } = useTranslation();
  const context = getRecentOpponentBattleContext(battle);

  if (!context) {
    return null;
  }

  return (
    <Card
      className={cn(
        "flex max-h-[420px] min-h-0 w-full flex-col gap-0 overflow-hidden border-border bg-card p-0 xl:h-[var(--battle-side-card-height)] xl:max-h-none",
        className,
      )}
    >
      <div className="flex min-h-[49px] shrink-0 items-center justify-between gap-3 border-b bg-background px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <History className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 leading-tight">
            <h3 className="truncate text-sm font-semibold">
              {t("battlePanel.single.recentOpponent.title")}
            </h3>
            <p className="truncate text-[11px] text-muted-foreground">
              {t("battlePanel.single.recentOpponent.subtitle", {
                opponentLevel: context.opponentLvl,
                opponentName: context.opponentName,
                opponentProf: context.opponentProf,
                userLevel: context.userLvl,
                userName: context.userName,
                userProf: context.userProf,
              })}
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
            >
              <Link
                aria-label={t("battlePanel.single.recentOpponent.viewAllAria", {
                  opponent: context.opponentName,
                })}
                to={
                  ROUTES.user.battlePanel.playerVsPlayer(
                    context.characterId,
                    context.opponentId,
                  ) as string
                }
                search={{ period: "all" }}
              >
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t("battlePanel.single.recentOpponent.viewAllAria", {
              opponent: context.opponentName,
            })}
          </TooltipContent>
        </Tooltip>
      </div>

      <RecentOpponentBattlesList battle={battle} />
    </Card>
  );
}
