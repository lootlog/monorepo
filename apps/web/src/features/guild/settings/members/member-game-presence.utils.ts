import type { PlayerPresence } from "@/lib/gateway-client";

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
