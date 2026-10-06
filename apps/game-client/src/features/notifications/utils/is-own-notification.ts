import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import type { ReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-cache";

/**
 * A player does not need their own reports back. A party gathering organized
 * on another Margonem account of the same Discord user is the exception: the
 * current account may join it.
 */
export function isOwnNotification(
  discordId: string,
  sessionDiscordId: string | undefined,
  gatheringOrganizer: ReadyRoomCharacterIdentity | undefined,
): boolean {
  if (discordId !== sessionDiscordId) return false;

  return (
    !gatheringOrganizer ||
    getCurrentReadyRoomCharacterIdentity()?.accountId ===
      gatheringOrganizer.accountId
  );
}
