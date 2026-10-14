import {
  isMemberGamePresenceVerified,
  isMemberOnlineInGame,
} from "@/features/guild/settings/members/member-game-presence.utils";
import { getMemberOnlineSources } from "@/features/guild/settings/members/member-list-item.utils";
import {
  isMemberOnlineOnWeb,
  type MemberWebPresenceByDiscordId,
} from "@/lib/web-presence";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { getColorFromRole } from "@/utils/get-color-from-role";
import type { MemberActivityStatsByDiscordId } from "./member-activity-stats.utils";
import type { MemberGamePresenceByDiscordId } from "./member-game-presence.utils";

/** Presence and activity of every member, as the member list receives them. */
export type MemberActivitySources = {
  activityStatsByDiscordIdAndSource: MemberActivityStatsByDiscordId;
  memberGamePresenceByDiscordId: MemberGamePresenceByDiscordId | undefined;
  memberWebPresenceByDiscordId: MemberWebPresenceByDiscordId | undefined;
};

export const getMemberDisplayData = (
  member: GuildMember,
  {
    activityStatsByDiscordIdAndSource,
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
  }: MemberActivitySources,
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
