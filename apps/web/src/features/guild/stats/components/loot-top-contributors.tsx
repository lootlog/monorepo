import type { LootStatsResponseDtoOutputTopContributorsItem } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { MemberIdentity } from "@/components/common/member-identity";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { useIsViewer } from "@/hooks/auth/use-is-viewer";

type LootTopContributorsProps = {
  data?: LootStatsResponseDtoOutputTopContributorsItem[];
  isLoading?: boolean;
};

export const LootTopContributors = ({
  data,
  isLoading,
}: LootTopContributorsProps) => {
  const { t } = useTranslation();
  const isViewer = useIsViewer();
  const contributors = data?.slice(0, LEADERBOARD_SIZE) ?? [];

  return (
    <StatsLeaderboardSection
      title={t("loots.stats.topContributors.title")}
      description={t("loots.stats.topContributors.description")}
      isLoading={isLoading}
      emptyMessage={
        contributors.length === 0
          ? t("loots.stats.topContributors.noData")
          : undefined
      }
    >
      {contributors.map((member, index) => (
        <StatsLeaderboardRow
          key={member.userId}
          rank={index + 1}
          media={
            // The name beside it opens the profile; one target per member.
            <MemberIdentity
              member={{ memberId: member.memberId }}
              fallback={{
                name: member.name,
                avatarUrl: getDiscordAvatarUrl(
                  member.userId,
                  member.avatar,
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
              member={{ memberId: member.memberId }}
              fallback={{ name: member.name }}
              display="name"
              nameClassName="leading-tight"
            />
          }
          value={member.count}
          isViewer={isViewer(member.userId)}
        />
      ))}
    </StatsLeaderboardSection>
  );
};
