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
import { RecentOpponentBattlesTable } from "./recent-opponent-battles-table";

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

  return (
    <Card
      className={cn(
        "flex max-h-[420px] min-h-0 w-full flex-col gap-0 overflow-hidden border-border bg-card p-0 xl:h-[var(--battle-side-card-height)] xl:max-h-none",
        className,
      )}
    >
      <div className="flex min-h-[61px] shrink-0 items-center justify-between gap-3 border-b bg-background px-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <History className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              {t("battlePanel.single.recentOpponent.title")}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {context
                ? t("battlePanel.single.recentOpponent.subtitle", {
                    opponent: context.opponentName,
                  })
                : t("battlePanel.single.recentOpponent.unsupported")}
            </p>
          </div>
        </div>
        {context && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2 text-xs"
              >
                <Link
                  aria-label={t(
                    "battlePanel.single.recentOpponent.viewAllAria",
                    {
                      opponent: context.opponentName,
                    },
                  )}
                  to={
                    ROUTES.user.battlePanel.playerVsPlayer(
                      context.characterId,
                      context.opponentId,
                    ) as string
                  }
                  search={{ period: "all" }}
                >
                  <span className="hidden sm:inline">
                    {t("battlePanel.single.recentOpponent.viewAll")}
                  </span>
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
        )}
      </div>

      <RecentOpponentBattlesTable battle={battle} />
    </Card>
  );
}
