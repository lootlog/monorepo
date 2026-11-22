import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import type { ReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-cache";

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
