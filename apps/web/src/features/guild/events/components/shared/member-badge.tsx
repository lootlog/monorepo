import { Link } from "@tanstack/react-router";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { Member } from "../../types/api";

interface MemberBadgeProps {
  eventId: string;
  guildId: string;
  member: Member;
}

export const MemberBadge = ({ eventId, guildId, member }: MemberBadgeProps) => {
  const color = useMemberColor(member);
  const avatarUrl = getDiscordAvatarUrl(member.userId, member.avatar, 32);

  return (
    <Link
      to="/$guildId/events/$eventId/members/$memberId"
      params={{
        guildId,
        eventId,
        memberId: String(member.id),
      }}
      className="flex min-w-0 items-center gap-2 border-b border-r border-border/70 bg-card px-3 py-2.5 outline-none transition-colors hover:bg-muted/30 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
      <img src={avatarUrl} alt="" className="size-7 shrink-0 rounded-full" />
      <span
        className="min-w-0 truncate text-sm font-semibold"
        style={{ color }}
        title={member.name}
      >
        {member.name}
      </span>
    </Link>
  );
};
