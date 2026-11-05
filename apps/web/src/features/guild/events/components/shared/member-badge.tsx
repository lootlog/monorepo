import { Link } from "@tanstack/react-router";
import { getMemberColor } from "@/utils/get-member-color";
import { MemberAvatar } from "@/components/common/member-avatar";
import type { Member } from "../../types/api";

interface MemberBadgeProps {
  eventId: string;
  guildId: string;
  member: Member;
}

export const MemberBadge = ({ eventId, guildId, member }: MemberBadgeProps) => {
  const color = getMemberColor(member);

  return (
    <Link
      to="/$guildId/events/$eventId/members/$memberId"
      params={{
        guildId,
        eventId,
        memberId: String(member.id),
      }}
      className="flex min-w-0 items-center gap-2 border-b border-r border-sidebar-border px-3 py-2.5 outline-none transition-colors hover:bg-muted/30 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <MemberAvatar
        userId={member.userId}
        avatar={member.avatar}
        name={member.name}
        className="size-7"
      />
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
