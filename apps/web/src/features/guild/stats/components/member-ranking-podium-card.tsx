import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { StatsPodiumSlot } from "./stats-podium-slot";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { ChevronRight, Users } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { GuildKillStatsResponseDtoOutputMemberRankingItem } from "@lootlog/client/main";
import type { NpcType } from "@lootlog/client/main";
import { TRACKABLE_NPC_TYPES } from "../constants";
import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/client/main";

const STORAGE_KEY = "stats-podium-npc-type";

type PodiumMember = GuildKillStatsResponseDtoOutputMemberRankingItem & {
  typeParticipations: number;
};

type MemberRankingPodiumCardProps = {
  data?: GuildKillStatsResponseDtoOutputMemberRankingItem[];
  isLoading?: boolean;
  guildId?: string;
  hasActiveFilters?: boolean;
};

export const MemberRankingPodiumCard: React.FC<
  MemberRankingPodiumCardProps
> = ({ data, isLoading, guildId, hasActiveFilters = false }) => {
  const { t } = useTranslation();
  const [selectedNpcType, setSelectedNpcType] = useLocalStorage<NpcType>(
    STORAGE_KEY,
    "ELITE2",
  );
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
          icon={Users}
          actions={
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[120px]" />
            </div>
          }
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

  const sortedByType: PodiumMember[] =
    data
      ?.map((m) => ({
        ...m,
        typeParticipations: m.participationsByType[selectedNpcType] ?? 0,
      }))
      .filter((m) => m.typeParticipations > 0)
      .sort((a, b) => b.typeParticipations - a.typeParticipations)
      .slice(0, 3) ?? [];

  return (
    <SectionCard className="flex flex-col">
      <SectionCardHeader
        title={t("kills.memberRanking.title")}
        icon={Users}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              value={selectedNpcType}
              onValueChange={(value) => setSelectedNpcType(value as NpcType)}
              items={[
                ...TRACKABLE_NPC_TYPES.map((type) => ({
                  value: type,
                  label: <>{t(`npcType.${type}`)}</>,
                })),
              ]}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACKABLE_NPC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`npcType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <SectionCardContent className="flex flex-col gap-3">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 flex items-center justify-center">
            {sortedByType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t(
                  hasActiveFilters
                    ? "kills.memberRanking.filteredNoData"
                    : "kills.memberRanking.noData",
                )}
              </p>
            ) : (
              <div className="flex items-end justify-center gap-2">
                {([2, 1, 3] as const).map((position) => {
                  const member = sortedByType[position - 1];
                  return (
                    <StatsPodiumSlot
                      key={position}
                      position={position}
                      member={
                        member
                          ? {
                              userId: member.memberUserId,
                              avatar: member.memberAvatar,
                              name: member.memberName,
                              memberId: member.memberId,
                              detail: `x${member.typeParticipations.toLocaleString()}`,
                            }
                          : undefined
                      }
                      guildMember={
                        member ? membersMap.get(member.memberUserId) : undefined
                      }
                      guildId={guildId}
                    />
                  );
                })}
              </div>
            )}
          </div>
          {guildId && (
            <Link
              to="/$guildId/stats/ranking"
              params={{ guildId }}
              className="block mt-3"
            >
              <Button variant="outline" className="w-full" size="sm">
                {t("kills.memberRanking.viewAll")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
