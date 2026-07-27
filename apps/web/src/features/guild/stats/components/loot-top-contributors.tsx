import { useTranslation } from "react-i18next";
import { Crown, Package } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "@lootlog/ui/lib/utils";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { LootStatsResponseDtoOutputTopContributorsItem } from "@lootlog/api-client/models/main/loot-stats-response-dto-output-top-contributors-item";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/api-client/react-query/main/members";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-reference-response-dto-output";

type PodiumSlotProps = {
  contributor?: LootStatsResponseDtoOutputTopContributorsItem;
  position: 1 | 2 | 3;
  guildMember?: GuildMember;
};

const PodiumSlot: React.FC<PodiumSlotProps> = ({
  contributor,
  position,
  guildMember,
}) => {
  const { t } = useTranslation();
  const adaptedMember = guildMember
    ? {
        roles: [{ position: 0, color: guildMember.color }],
      }
    : undefined;
  const memberColor = useMemberColor(adaptedMember);
  const heights = {
    1: "h-44",
    2: "h-36",
    3: "h-32",
  };

  const podiumColors = {
    1: "bg-yellow-500/20",
    2: "bg-gray-400/20",
    3: "bg-amber-700/20",
  };

  const textColors = {
    1: "text-yellow-500",
    2: "text-gray-400",
    3: "text-amber-600",
  };

  if (!contributor) {
    return (
      <div className={cn("flex flex-col items-center w-28", heights[position])}>
        <div className="h-14 w-14 rounded-full bg-muted" />
        <span className="text-sm text-muted-foreground mt-1">-</span>
        <div
          className={cn(
            "w-full flex-1 rounded-t-md flex items-center justify-center mt-2",
            podiumColors[position],
          )}
        >
          <span className={cn("text-xl font-bold", textColors[position])}>
            {position}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-28", heights[position])}>
      <div className="relative">
        {position === 1 && (
          <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-500 animate-pulse drop-shadow-lg" />
        )}
        <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
          <AvatarImage
            src={getDiscordAvatarUrl(
              contributor.userId,
              contributor.avatar,
              80,
            )}
          />
          <AvatarFallback>{contributor.name[0]}</AvatarFallback>
        </Avatar>
      </div>

      <span
        className="text-sm font-medium truncate max-w-full mt-1"
        style={{ color: memberColor }}
      >
        {contributor.name}
      </span>

      <span className="text-xs text-muted-foreground">
        {contributor.count.toLocaleString()}{" "}
        {t("loots.stats.topContributors.submissions")}
      </span>

      <div
        className={cn(
          "w-full flex-1 rounded-t-md flex items-center justify-center mt-2",
          podiumColors[position],
        )}
      >
        <span className={cn("text-xl font-bold", textColors[position])}>
          {position}
        </span>
      </div>
    </div>
  );
};

type LootTopContributorsProps = {
  data?: LootStatsResponseDtoOutputTopContributorsItem[];
  isLoading?: boolean;
};

export const LootTopContributors: React.FC<LootTopContributorsProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: guildMembers } = useMembersControllerGetGuildMemberReferences(
    { guildId: guildId ?? "" },
    {
      includeInactive: true,
    },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getMembersControllerGetGuildMemberReferencesQueryKey(
          { guildId: guildId ?? "" },
          { includeInactive: true },
        ),
      },
    },
  );

  const membersMap = new Map(guildMembers?.map((m) => [m.userId, m]) ?? []);

  if (isLoading) {
    return (
      <Card className="bg-card  border-border p-3 gap-3 flex flex-col">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </h2>
        <div className="flex items-end justify-center gap-2">
          <Skeleton className="h-24 w-24" />
          <Skeleton className="h-32 w-24" />
          <Skeleton className="h-20 w-24" />
        </div>
      </Card>
    );
  }

  const topThree = data?.slice(0, 3) ?? [];

  return (
    <Card className="bg-card  border-border p-3 gap-3 flex flex-col">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Package className="h-5 w-5" />
        {t("loots.stats.topContributors.title")}
      </h2>
      <div className="flex flex-1 flex-col">
        <div className="flex-1 flex items-center justify-center">
          {topThree.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("loots.stats.topContributors.noData")}
            </p>
          ) : (
            <div className="flex items-end justify-center gap-2">
              <PodiumSlot
                contributor={topThree[1]}
                position={2}
                guildMember={
                  topThree[1] ? membersMap.get(topThree[1].userId) : undefined
                }
              />
              <PodiumSlot
                contributor={topThree[0]}
                position={1}
                guildMember={
                  topThree[0] ? membersMap.get(topThree[0].userId) : undefined
                }
              />
              <PodiumSlot
                contributor={topThree[2]}
                position={3}
                guildMember={
                  topThree[2] ? membersMap.get(topThree[2].userId) : undefined
                }
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
