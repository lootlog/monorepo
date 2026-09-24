import type { PlayerPresence } from "@/lib/gateway-client";
import { useOrganizationPresence } from "@/hooks/use-organization-presence";

interface UseEventPresenceOptions {
  guildId?: string;
  world?: string;
}

export const useEventPresence = ({
  guildId,
  world,
}: UseEventPresenceOptions) => {
  const { game, accessState, refetch } = useOrganizationPresence(
    world ? guildId : undefined,
  );

  let presenceData: Map<string, PlayerPresence[]> | undefined;

  if (game) {
    presenceData = new Map();

    for (const [discordId, players] of game) {
      const filteredPlayers = players.filter(
        (player) => player.world === world,
      );

      if (filteredPlayers.length > 0) {
        presenceData.set(discordId, filteredPlayers);
      }
    }
  }

  return { presenceData, accessState, refetch };
};
