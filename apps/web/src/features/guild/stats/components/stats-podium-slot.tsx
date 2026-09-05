import { Link } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Crown } from "lucide-react";
import { cn } from "cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@lootlog/client/main";

type StatsPodiumSlotProps = {
  member?: {
    userId: string;
    avatar: string | null;
    name: string;
    detail: string;
    memberId?: number;
  };
  position: 1 | 2 | 3;
  guildMember?: GuildMember;
  guildId?: string;
};

export const StatsPodiumSlot: React.FC<StatsPodiumSlotProps> = ({
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
            src={getDiscordAvatarUrl(member.userId, member.avatar, 80)}
          />
          <AvatarFallback>{member.name[0]}</AvatarFallback>
        </Avatar>
      </div>

      <span
        className="text-sm font-medium truncate max-w-full mt-1"
        style={{ color: memberColor }}
      >
        {member.name}
      </span>

      <span className="text-xs text-muted-foreground">{member.detail}</span>

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

  if (guildId && member.memberId !== undefined) {
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
