import { useGameStore } from "@/store/game.store";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";

export const usePartyCommand = () => {
  const { startPartyGathering } = usePartyGatheringOrchestration();
  const world = useGameStore((state) => state.game?.world);

  const handlePartyCommand = async (
    description: string | undefined,
    guildIds: string[],
  ) => {
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
