import { useQuery } from "@tanstack/react-query";
import { memberActivityStatsQueryOptions } from "./member-activity-stats-api";
import { mapMemberActivityStatsByDiscordIdAndSource } from "./member-activity-stats.utils";
import { useMemberGamePresence } from "./use-member-game-presence";
import { useMemberWebPresence } from "./use-member-web-presence";

export const useMemberActivity = (guildId: string | undefined) => {
  const { data: memberActivityStats } = useQuery(
    memberActivityStatsQueryOptions(guildId),
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
