import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { ChevronRight, Crown, Users } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "@lootlog/ui/lib/utils";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { GuildKillStatsResponseDtoOutputMemberRankingItem } from "@/lib/api/generated/main/model/guild-kill-stats-response-dto-output-member-ranking-item";
import type { NpcType } from "@/lib/api/generated/main/model/npc-type";
import { TRACKABLE_NPC_TYPES } from "../constants";
import { useMembersControllerGetGuildMemberReferences } from "@/lib/api/generated/main/members/members";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@/lib/api/generated/main/model";

const STORAGE_KEY = "stats-podium-npc-type";

type PodiumMember = GuildKillStatsResponseDtoOutputMemberRankingItem & {
  typeParticipations: number;
};

type PodiumSlotProps = {
  member?: PodiumMember;
  position: 1 | 2 | 3;
  guildMember?: GuildMember;
  guildId?: string;
};

const PodiumSlot: React.FC<PodiumSlotProps> = ({
  member,
  position,
  guildMember,
  guildId,
}) => {
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

  if (!member) {
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

  const content = (
    <div className={cn("flex flex-col items-center w-28", heights[position])}>
      <div className="relative">
        {position === 1 && (
          <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-500 animate-pulse drop-shadow-lg" />
        )}
        <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
          <AvatarImage
            src={getDiscordAvatarUrl(
              member.memberUserId,
              member.memberAvatar,
              80,
            )}
          />
          <AvatarFallback>{member.memberName[0]}</AvatarFallback>
        </Avatar>
      </div>

      <span
        className="text-sm font-medium truncate max-w-full mt-1"
        style={{ color: memberColor }}
      >
        {member.memberName}
      </span>

      <span className="text-xs text-muted-foreground">
        x{member.typeParticipations.toLocaleString()}
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

  if (guildId) {
    return (
      <Link
        to="/$guildId/stats/members/$memberId"
        params={{ guildId, memberId: member.memberId.toString() }}
        className="hover:opacity-80 transition-opacity"
      >
        {content}
      </Link>
    );
  }

  return content;
};

type MemberRankingPodiumCardProps = {
  data?: GuildKillStatsResponseDtoOutputMemberRankingItem[];
  isLoading?: boolean;
  guildId?: string;
};

export const MemberRankingPodiumCard: React.FC<
  MemberRankingPodiumCardProps
> = ({ data, isLoading, guildId }) => {
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
  );

  const membersMap = new Map(guildMembers?.map((m) => [m.userId, m]) ?? []);

  if (isLoading) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </h2>
          <Skeleton className="h-8 w-[120px]" />
        </div>
        <div className="flex items-end justify-center gap-2">
          <Skeleton className="h-24 w-24" />
          <Skeleton className="h-32 w-24" />
          <Skeleton className="h-20 w-24" />
        </div>
      </Card>
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
    <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("kills.memberRanking.title")}
        </h2>
        <Select
          value={selectedNpcType}
          onValueChange={(value) => setSelectedNpcType(value as NpcType)}
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
      <div className="flex flex-1 flex-col">
        <div className="flex-1 flex items-center justify-center">
          {sortedByType.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("kills.memberRanking.noData")}
            </p>
          ) : (
            <div className="flex items-end justify-center gap-2">
              <PodiumSlot
                member={sortedByType[1]}
                position={2}
                guildMember={
                  sortedByType[1]
                    ? membersMap.get(sortedByType[1].memberUserId)
                    : undefined
                }
                guildId={guildId}
              />
              <PodiumSlot
                member={sortedByType[0]}
                position={1}
                guildMember={
                  sortedByType[0]
                    ? membersMap.get(sortedByType[0].memberUserId)
                    : undefined
                }
                guildId={guildId}
              />
              <PodiumSlot
                member={sortedByType[2]}
                position={3}
                guildMember={
                  sortedByType[2]
                    ? membersMap.get(sortedByType[2].memberUserId)
                    : undefined
                }
                guildId={guildId}
              />
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
    </Card>
  );
};
