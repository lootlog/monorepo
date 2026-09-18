import type {
  GuildKillStatsResponseDtoOutputMemberRankingItem,
  NpcType,
} from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGuildMemberMap } from "../hooks/use-guild-member-map";
import { MemberNameWithColor } from "./member-name-with-color";
import { StatsMemberAvatar } from "./stats-member-avatar";
import { StatsLeaderboardCard } from "./stats-leaderboard-card";
import { StatsLeaderboardRow } from "./stats-leaderboard-row";

const LEADERBOARD_SIZE = 5;

type MemberLeaderboardCardProps = {
  data?: GuildKillStatsResponseDtoOutputMemberRankingItem[];
  npcType: NpcType;
  isLoading?: boolean;
  guildId: string;
  hasActiveFilters?: boolean;
};

export const MemberLeaderboardCard = ({
  data,
  npcType,
  isLoading,
  guildId,
  hasActiveFilters = false,
}: MemberLeaderboardCardProps) => {
  const { t } = useTranslation();
  const membersMap = useGuildMemberMap(guildId);

  const leaders = (data ?? [])
    .flatMap((member) => {
      const participations = member.participationsByType[npcType] ?? 0;

      return participations > 0 ? [{ ...member, participations }] : [];
    })
    .sort((a, b) => b.participations - a.participations)
    .slice(0, LEADERBOARD_SIZE);

  return (
    <StatsLeaderboardCard
      title={t("kills.memberRanking.title")}
      description={t("kills.memberRanking.description", {
        type: t(`npcType.${npcType}`),
      })}
      isLoading={isLoading}
      emptyMessage={
        leaders.length === 0
          ? t(
              hasActiveFilters
                ? "kills.memberRanking.filteredNoData"
                : "kills.memberRanking.noData",
            )
          : undefined
      }
      actions={
        <ChevronLink
          className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
          render=<Link to="/$guildId/stats/ranking" params={{ guildId }} />
        >
          {t("kills.memberRanking.viewAll")}
        </ChevronLink>
      }
    >
      {leaders.map((member, index) => (
        <StatsLeaderboardRow
          key={member.memberId}
          rank={index + 1}
          media={
            <StatsMemberAvatar
              userId={member.memberUserId}
              avatar={member.memberAvatar}
              name={member.memberName}
            />
          }
          title={
            <MemberNameWithColor
              name={member.memberName}
              member={membersMap.get(member.memberUserId)}
            />
          }
          value={member.participations}
          maxValue={leaders[0]?.participations ?? 0}
          link={{
            to: "/$guildId/stats/members/$memberId",
            params: { guildId, memberId: String(member.memberId) },
          }}
        />
      ))}
    </StatsLeaderboardCard>
  );
};
