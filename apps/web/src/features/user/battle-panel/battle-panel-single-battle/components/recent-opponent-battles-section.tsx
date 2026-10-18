import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { BandSection } from "@/components/common/band-section";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { getRecentOpponentBattleContext } from "./recent-opponent-battle-context";
import { RecentOpponentBattlesList } from "./recent-opponent-battles-list";

type RecentOpponentBattlesSectionProps = {
  battle: Battle | undefined;
};

export function RecentOpponentBattlesSection({
  battle,
}: RecentOpponentBattlesSectionProps) {
  const { t } = useTranslation();
  const id = useId();
  const context = getRecentOpponentBattleContext(battle);

  if (!context) {
    return null;
  }

  return (
    <BandSection
      id={id}
      tiled
      title={t("battlePanel.single.recentOpponent.title")}
      description={t("battlePanel.single.recentOpponent.subtitle", {
        opponentLevel: context.opponentLvl,
        opponentName: context.opponentName,
        opponentProf: context.opponentProf,
        userLevel: context.userLvl,
        userName: context.userName,
        userProf: context.userProf,
      })}
      trailing={
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
    >
      <RecentOpponentBattlesList battle={battle} />
    </BandSection>
  );
}
