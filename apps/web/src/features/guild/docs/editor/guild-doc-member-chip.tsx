import { MemberIdentity } from "@/components/common/member-identity";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import type { GuildDocMember } from "./guild-doc-member-node";

type GuildDocMemberChipProps = {
  member: GuildDocMember;
};

/**
 * A mentioned member under their current Discord name, avatar and colour; the
 * name saved with the mention stands in once they are no longer known.
 */
export const GuildDocMemberChip = ({ member }: GuildDocMemberChipProps) => {
  // While the document is being written a click on the chip places the caret.
  const editable = useLexicalEditable();

  return (
    <span className="inline-flex items-center rounded-full bg-muted/60 py-0.5 pr-2 pl-0.5 align-middle whitespace-nowrap">
      <MemberIdentity
        member={{ discordId: member.userId }}
        fallback={{
          name: member.name,
          avatarUrl: getDiscordAvatarUrl(member.userId, null, 40),
        }}
        interactive={!editable}
        nameClassName="text-[length:inherit]"
      />
    </span>
  );
};
