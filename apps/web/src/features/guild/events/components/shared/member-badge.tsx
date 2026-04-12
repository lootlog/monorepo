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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-transparent hover:border-border transition-colors">
      {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
      <img src={avatarUrl} alt={member.name} className="w-5 h-5 rounded-full" />
      <span className="text-sm font-medium" style={{ color }}>
        {member.name}
      </span>
    </div>
  );
};
