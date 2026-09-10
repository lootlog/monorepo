import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@lootlog/client/main";
type MemberNameWithColorProps = {
  name: string;
  member?: GuildMember;
};

export const MemberNameWithColor: React.FC<MemberNameWithColorProps> = ({
  name,
  member,
}) => {
  const adaptedMember = member
    ? {
        roles: [{ position: 0, color: member.color }],
      }
    : undefined;
  const color = useMemberColor(adaptedMember);
  return (
    <span className="font-medium" style={{ color }}>
      {name}
    </span>
  );
};
