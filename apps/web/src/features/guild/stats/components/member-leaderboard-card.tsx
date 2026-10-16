import type {
  GuildKillStatsResponseDtoOutputMemberRankingItem,
  NpcType,
} from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGuildMemberMap } from "../hooks/use-guild-member-map";
import { MemberNameWithColor } from "./member-name-with-color";
import { MemberAvatar } from "@/components/common/member-avatar";
import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";

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
    <StatsLeaderboardSection
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
            <MemberAvatar
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
    </StatsLeaderboardSection>
  );
};
