import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCard } from "@/components/common/section-card/section-card";
import { cn } from "cn";
import { History } from "lucide-react";
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
        "isolate flex min-h-0 w-full flex-col gap-0 overflow-hidden border-border bg-card p-0",
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
          <ChevronLink
            className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
            aria-label={t("battlePanel.single.recentOpponent.viewAllAria", {
              opponent: context.opponentName,
            })}
            render=<Link
              to={ROUTES.user.battlePanel.playerVsPlayer(
                context.characterId,
                context.opponentId,
              )}
              search={{ period: "all" }}
            />
          >
            {t("battlePanel.single.recentOpponent.viewAll")}
          </ChevronLink>
        }
        className="shrink-0"
      />

      <RecentOpponentBattlesList battle={battle} />
    </SectionCard>
  );
}
