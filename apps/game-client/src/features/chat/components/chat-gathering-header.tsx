import { useTranslation } from "react-i18next";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import { getSelectedChatGuildId, useChatStore } from "@/store/chat.store";

type Props = {
  organizerDiscordId?: string;
  guildIds: readonly string[];
};

export function ChatGatheringHeader({ organizerDiscordId, guildIds }: Props) {
  const { t } = useTranslation("chat");
  const { visibleGuilds } = useVisibleLootlogGuilds();
  const selectedGuildId = useChatStore(getSelectedChatGuildId);
  const gatheringGuilds = visibleGuilds.filter((guild) =>
    guildIds.includes(guild.id),
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
  return (
    <span className="ll:min-h-[18px] ll:min-w-0 ll:[overflow-wrap:anywhere] ll:text-[12px] ll:leading-[18px]">
      <span className="ll:font-semibold" style={{ color: `#${color}` }}>
        {member?.name ?? t("contextMenu.unknownUser")}
      </span>
    </span>
  );
}
