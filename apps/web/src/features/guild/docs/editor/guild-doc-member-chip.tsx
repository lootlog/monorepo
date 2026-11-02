import { MemberAvatar } from "@/components/common/member-avatar";
import { MemberNameWithColor } from "@/components/common/member-name-with-color";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { GuildDocMember } from "./guild-doc-member-node";

type GuildDocMemberChipProps = {
  member: GuildDocMember;
};

/**
 * A mentioned member under their current Discord name, avatar and colour; the
 * name saved with the mention stands in once they are no longer known.
 */
export const GuildDocMemberChip = ({ member }: GuildDocMemberChipProps) => {
  const guildMember = useGuildMemberMap(useGuildId()).get(member.userId);
  const name = guildMember?.name ?? member.name;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pr-2 pl-0.5 align-middle whitespace-nowrap">
      <MemberAvatar
        userId={member.userId}
        avatar={guildMember?.avatar ?? null}
        name={name}
        className="size-5"
        imageSize={40}
      />
      <MemberNameWithColor name={name} member={guildMember} />
    </span>
  );
};
