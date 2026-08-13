import { useMemberColor } from "@/hooks/discord/use-member-color";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { Member } from "../../types/api";

interface MemberBadgeProps {
  member: Member;
}

export const MemberBadge = ({ member }: MemberBadgeProps) => {
  const color = useMemberColor(member);
  const avatarUrl = getDiscordAvatarUrl(member.userId, member.avatar, 32);

  return (
    <div className="flex min-w-0 items-center gap-2 bg-card px-3 py-2.5 transition-colors hover:bg-muted/30">
      {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
      <img
        src={avatarUrl}
        alt={member.name}
        className="size-7 shrink-0 rounded-full"
      />
      <span
        className="min-w-0 truncate text-sm font-semibold"
        style={{ color }}
        title={member.name}
      >
        {member.name}
      </span>
    </div>
  );
};
