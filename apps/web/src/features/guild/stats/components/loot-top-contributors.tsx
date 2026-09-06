import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { StatsPodiumSlot } from "./stats-podium-slot";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { LootStatsResponseDtoOutputTopContributorsItem } from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/client/main";

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
      <SectionCard className="flex flex-col">
        <SectionCardHeader
          title={<Skeleton className="h-5 w-40" />}
          icon={Package}
        />
        <SectionCardContent className="flex flex-col gap-3">
          <div className="flex items-end justify-center gap-2">
            <Skeleton className="h-24 w-24" />
            <Skeleton className="h-32 w-24" />
            <Skeleton className="h-20 w-24" />
          </div>
        </SectionCardContent>
      </SectionCard>
    );
  }

  const topThree = data?.slice(0, 3) ?? [];

  return (
    <SectionCard className="flex flex-col">
      <SectionCardHeader
        title={t("loots.stats.topContributors.title")}
        icon={Package}
      />
      <SectionCardContent className="flex flex-col gap-3">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 flex items-center justify-center">
            {topThree.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("loots.stats.topContributors.noData")}
              </p>
            ) : (
              <div className="flex items-end justify-center gap-2">
                {([2, 1, 3] as const).map((position) => {
                  const member = topThree[position - 1];
                  return (
                    <StatsPodiumSlot
                      key={position}
                      position={position}
                      member={
                        member
                          ? {
                              userId: member.userId,
                              avatar: member.avatar,
                              name: member.name,
                              detail: `${member.count.toLocaleString()} ${t("loots.stats.topContributors.submissions")}`,
                            }
                          : undefined
                      }
                      guildMember={
                        member ? membersMap.get(member.userId) : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
