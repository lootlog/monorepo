import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { getSelectedChatGuildId, useChatStore } from "@/store/chat.store";

type Props = {
  organizerDiscordId?: string;
  guildIds: readonly string[];
};

/** The organizer's Lootlog member name, in their role colour. */
export function ChatGatheringOrganizerMember({
  organizerDiscordId,
  guildIds,
}: Props) {
  const { visibleGuilds } = useLootlogGuilds();
  const selectedGuildId = useChatStore(getSelectedChatGuildId);
  const gatheringGuildIds = new Set(guildIds);

  const gatheringGuilds = visibleGuilds.filter((guild) =>
    gatheringGuildIds.has(guild.id),
  );

  const guildId =
    gatheringGuilds.find((guild) => guild.id === selectedGuildId)?.id ??
    gatheringGuilds[0]?.id ??
    "";

  const { data: members } = useGuildMembersSummary(
    { guildId },
    { query: { enabled: Boolean(guildId && organizerDiscordId) } },
  );

  const member = members?.find((entry) => entry.userId === organizerDiscordId);
  const color = useMemberColor(member);

  if (!member) return null;

  return (
    <span className="ll:min-w-0 ll:truncate" style={{ color: `#${color}` }}>
      {member.name}
    </span>
  );
}
