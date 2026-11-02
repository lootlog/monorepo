import type { KilledNpcType } from "@/constants/npc";
import type { GuildKillStatsResponseDtoOutputMemberRankingItem } from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { MemberNameWithColor } from "@/components/common/member-name-with-color";
import { MemberAvatar } from "@/components/common/member-avatar";
import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { useIsViewer } from "@/hooks/auth/use-is-viewer";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";

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
  const membersMap = useGuildMemberMap(guildId);
  const isViewer = useIsViewer();

  const ranked = (data ?? [])
    .flatMap((member) => {
      const participations = member.participationsByType[npcType] ?? 0;

      return participations > 0 ? [{ ...member, participations }] : [];
    })
    .sort((a, b) => b.participations - a.participations);

  const leaders = ranked.slice(0, LEADERBOARD_SIZE);

  // The viewer's own place follows the leaders when it falls outside them.
  const ownIndex = ranked.findIndex(
    (member, index) =>
      index >= LEADERBOARD_SIZE && isViewer(member.member.userId),
  );

  const renderRow = (member: (typeof ranked)[number], rank: number) => (
    <StatsLeaderboardRow
      key={member.member.id}
      rank={rank}
      media={
        <MemberAvatar
          userId={member.member.userId}
          avatar={member.member.avatar}
          name={member.member.name}
        />
      }
      title={
        <MemberNameWithColor
          name={member.member.name}
          member={membersMap.get(member.member.userId)}
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
      {ownMember && (
        <>
          {/* The places skipped between the leaders and the viewer's own. */}
          <li
            aria-hidden="true"
            className={cn(
              "flex h-6 items-center text-xs leading-none text-muted-foreground",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            ⋯
          </li>
          {renderRow(ownMember, ownIndex + 1)}
        </>
      )}
    </StatsLeaderboardSection>
  );
};
