import {
  isMemberGamePresenceVerified,
  isMemberOnlineInGame,
} from "@/features/guild/settings/members/member-game-presence.utils";
import { getMemberOnlineSources } from "@/features/guild/settings/members/member-list-item.utils";
import { isMemberOnlineOnWeb } from "@/features/guild/settings/members/member-web-presence.utils";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { getColorFromRole } from "@/utils/get-color-from-role";

import type { MembersTableProps } from "./members-table";

export const getMemberDisplayData = (
  member: GuildMember,
  {
    activityStatsByDiscordIdAndSource,
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
  }: Pick<
    MembersTableProps,
    | "activityStatsByDiscordIdAndSource"
    | "memberGamePresenceByDiscordId"
    | "memberWebPresenceByDiscordId"
  >,
) => {
  const webActivityStats = activityStatsByDiscordIdAndSource.get(
    member.userId,
  )?.WEB_APP;

  const gameActivityStats = activityStatsByDiscordIdAndSource.get(
    member.userId,
  )?.GAME;

  const isOnlineOnWeb = isMemberOnlineOnWeb(
    memberWebPresenceByDiscordId,
    member.userId,
  );

  const isOnlineInGame = isMemberOnlineInGame(
    memberGamePresenceByDiscordId,
    member.userId,
  );

  const isGamePresenceVerified = isMemberGamePresenceVerified(
    memberGamePresenceByDiscordId,
    member.userId,
  );

  const onlineSources = getMemberOnlineSources({
    isOnlineOnWeb,
    isOnlineInGame,
  });

  const color = getColorFromRole(member.roles);

  return {
    webActivityStats,
    gameActivityStats,
    isOnlineOnWeb,
    isOnlineInGame,
    isGamePresenceVerified,
    onlineSources,
    color,
  };
};
