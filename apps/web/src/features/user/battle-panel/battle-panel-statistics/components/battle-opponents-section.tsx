import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { BattleOpponentRow } from "@/features/user/battle-panel/components/battle-opponent-row";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link, type LinkProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

type BattleOpponentsSectionProps = {
  records: HeadToHeadRecord[];
  isLoading: boolean;
  /** The full list of opponents. */
  allOpponentsLink: LinkProps;
  /** The head-to-head page with one opponent. */
  getOpponentLink: (opponentId: string) => LinkProps;
  rated?: boolean;
};

/** The opponents fought most often, each opening the head-to-head with them. */
export function BattleOpponentsSection({
  records,
  isLoading,
  allOpponentsLink,
  getOpponentLink,
  rated = false,
}: BattleOpponentsSectionProps) {
  const { t } = useTranslation();

  return (
    <StatsLeaderboardSection
      title={t("battlePanel.statistics.opponents.title")}
      isLoading={isLoading}
      emptyMessage={
        records.length === 0
          ? t("battlePanel.statistics.directMatchups.emptyTitle")
          : undefined
      }
      actions={
        <ChevronLink render=<Link {...allOpponentsLink} />>
          {t("battlePanel.statistics.opponents.all")}
        </ChevronLink>
      }
    >
      {records.slice(0, LEADERBOARD_SIZE).map((record) => (
        <BattleOpponentRow
          key={record.opponentId}
          record={record}
          rated={rated}
          link={getOpponentLink(record.opponentId)}
        />
      ))}
    </StatsLeaderboardSection>
  );
}
