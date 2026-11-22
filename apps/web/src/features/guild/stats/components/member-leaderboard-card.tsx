import type { KilledNpcType } from "@/constants/npc";
import type { GuildKillStatsResponseDtoOutputMemberRankingItem } from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MemberIdentity } from "@/components/common/member-identity";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { useIsViewer } from "@/hooks/auth/use-is-viewer";

type MemberLeaderboardCardProps = {
  data?: GuildKillStatsResponseDtoOutputMemberRankingItem[];
  npcType: KilledNpcType;
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
  const isViewer = useIsViewer();

  const ranked = (data ?? [])
    .flatMap((member) => {
      const participations = member.participationsByType[npcType] ?? 0;

      return participations > 0 ? [{ ...member, participations }] : [];
    })
    .sort((a, b) => b.participations - a.participations);

  const ownIndex = ranked.findIndex(
    (member, index) =>
      index >= LEADERBOARD_SIZE && isViewer(member.member.userId),
  );

  const leaders = ranked.slice(
    0,
    ownIndex === -1 ? LEADERBOARD_SIZE : LEADERBOARD_SIZE - 1,
  );

  const renderRow = (member: (typeof ranked)[number], rank: number) => (
    <StatsLeaderboardRow
      key={member.member.id}
      rank={rank}
      media={
        <MemberIdentity
          member={{ memberId: member.member.id }}
          fallback={{
            name: member.member.name,
            avatarUrl: getDiscordAvatarUrl(
              member.member.userId,
              member.member.avatar,
              64,
            ),
          }}
          display="avatar"
          interactive={false}
          avatarClassName="size-8"
        />
      }
      title={
        <MemberIdentity
          member={{ memberId: member.member.id }}
          fallback={{ name: member.member.name }}
          display="name"
          nameClassName="leading-tight"
        />
      }
      value={member.participations}
      isViewer={isViewer(member.member.userId)}
      link={{
        to: "/$guildId/stats/members/$memberId",
        params: { guildId, memberId: String(member.member.id) },
      }}
    />
  );

  const ownMember = ranked[ownIndex];

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
      {leaders.map((member, index) => renderRow(member, index + 1))}
      {ownMember && renderRow(ownMember, ownIndex + 1)}
    </StatsLeaderboardSection>
  );
};
