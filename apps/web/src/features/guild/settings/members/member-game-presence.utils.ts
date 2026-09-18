import type { PlayerPresence } from "@/lib/gateway-client";
import {
  isMemberOnlineOnWeb,
  type MemberWebPresenceByDiscordId,
} from "@/features/guild/settings/members/member-web-presence.utils";

export type MemberGamePresenceByDiscordId = Map<string, PlayerPresence[]>;

export const mapMemberGamePresenceByDiscordId = (
  players: Record<string, PlayerPresence[]> | undefined,
): MemberGamePresenceByDiscordId => {
  const presenceByDiscordId: MemberGamePresenceByDiscordId = new Map();

  for (const [discordId, presence] of Object.entries(players ?? {})) {
    if (presence.length > 0) {
      presenceByDiscordId.set(discordId, presence);
    }
  }

  return presenceByDiscordId;
};

export const isMemberOnlineInGame = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  discordId: string,
) => (presenceByDiscordId?.get(discordId)?.length ?? 0) > 0;

export const isMemberGamePresenceVerified = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  discordId: string,
) =>
  presenceByDiscordId
    ?.get(discordId)
    ?.some((presence) => presence.margonemAccountVerified === true) ?? false;

export const getMemberGameSessionCount = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  discordId: string,
) => presenceByDiscordId?.get(discordId)?.length ?? 0;

export const getMemberOnlineSources = ({
  webPresenceByDiscordId,
  gamePresenceByDiscordId,
  discordId,
}: {
  webPresenceByDiscordId?: MemberWebPresenceByDiscordId;
  gamePresenceByDiscordId?: MemberGamePresenceByDiscordId;
  discordId: string;
}) => {
  const web = isMemberOnlineOnWeb(webPresenceByDiscordId, discordId);
  const game = isMemberOnlineInGame(gamePresenceByDiscordId, discordId);

  return {
    web,
    game,
    online: web || game,
  };
};
