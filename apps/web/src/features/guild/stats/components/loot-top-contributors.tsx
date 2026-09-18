import type { LootStatsResponseDtoOutputTopContributorsItem } from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useTranslation } from "react-i18next";
import { LEADERBOARD_SIZE } from "../constants";
import { useGuildMemberMap } from "../hooks/use-guild-member-map";
import { MemberNameWithColor } from "./member-name-with-color";
import { StatsMemberAvatar } from "./stats-member-avatar";
import { StatsLeaderboardCard } from "./stats-leaderboard-card";
import { StatsLeaderboardRow } from "./stats-leaderboard-row";

type LootTopContributorsProps = {
  data?: LootStatsResponseDtoOutputTopContributorsItem[];
  isLoading?: boolean;
};

export const LootTopContributors = ({
  data,
  isLoading,
}: LootTopContributorsProps) => {
  const { t } = useTranslation();
  const membersMap = useGuildMemberMap(useGuildId());
  const contributors = data?.slice(0, LEADERBOARD_SIZE) ?? [];

  return (
    <StatsLeaderboardCard
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
            <StatsMemberAvatar
              userId={member.userId}
              avatar={member.avatar}
              name={member.name}
            />
          }
          title={
            <MemberNameWithColor
              name={member.name}
              member={membersMap.get(member.userId)}
            />
          }
          value={member.count}
          maxValue={contributors[0]?.count ?? 0}
        />
      ))}
    </StatsLeaderboardCard>
  );
};
