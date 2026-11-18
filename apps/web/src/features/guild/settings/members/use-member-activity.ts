import { useActivitiesControllerGetMemberActivityStats } from "@lootlog/client/activity";
import { mapMemberActivityStatsByDiscordIdAndSource } from "./member-activity-stats.utils";
import { useMemberGamePresence } from "./use-member-game-presence";
import { useMemberWebPresence } from "./use-member-web-presence";

export const useMemberActivity = (guildId: string | undefined) => {
  const { data: memberActivityStats } =
    useActivitiesControllerGetMemberActivityStats(
      { guildId: guildId ?? "" },
      { query: { enabled: Boolean(guildId) } },
    );

  const memberGamePresenceByDiscordId = useMemberGamePresence(guildId);
  const memberWebPresenceByDiscordId = useMemberWebPresence(guildId);

  return {
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
    memberActivityStatsByDiscordIdAndSource:
      mapMemberActivityStatsByDiscordIdAndSource(memberActivityStats),
  };
};
