import type { PlayerPresence } from "@/lib/gateway-client";
import {
  isMemberOnlineOnWeb,
  type MemberWebPresenceByDiscordId,
} from "@/lib/web-presence";

export type MemberGamePresenceByDiscordId = Map<string, PlayerPresence[]>;

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
