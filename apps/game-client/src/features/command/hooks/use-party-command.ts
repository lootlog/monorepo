import { Game } from "@/lib/game";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";

export const usePartyCommand = () => {
  const { startPartyGathering } = usePartyGatheringOrchestration();

  const handlePartyCommand = async (
    description: string | undefined,
    guildIds: string[],
  ) => {
    const world = Game.getWorldName();
    if (guildIds.length === 0 || !world) return;

    try {
      await startPartyGathering({
        guildIds,
        world,
        description,
      });
    } catch (error) {
      window.message(getCreatePartyGatheringErrorMessage(error));
    }
  };

  return { handlePartyCommand };
};
