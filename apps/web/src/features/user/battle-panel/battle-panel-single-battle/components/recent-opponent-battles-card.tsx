import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { SectionCard } from "@/components/common/section-card/section-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
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
    <SectionCard
      className={cn(
        "flex max-h-[420px] min-h-0 w-full flex-col gap-0 overflow-hidden border-border bg-card p-0 xl:h-[var(--battle-side-card-height)] xl:max-h-none",
        className,
      )}
    >
      <SectionCardHeader
        icon={History}
        title={t("battlePanel.single.recentOpponent.title")}
        description={t("battlePanel.single.recentOpponent.subtitle", {
          opponentLevel: context.opponentLvl,
          opponentName: context.opponentName,
          opponentProf: context.opponentProf,
          userLevel: context.userLvl,
          userName: context.userName,
          userProf: context.userProf,
        })}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  render={
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
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  }
                  nativeButton={false}
                />
              }
            />
            <TooltipContent>
              {t("battlePanel.single.recentOpponent.viewAllAria", {
                opponent: context.opponentName,
              })}
            </TooltipContent>
          </Tooltip>
        }
        className="shrink-0"
      />

      <RecentOpponentBattlesList battle={battle} />
    </SectionCard>
  );
}
