import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";

export const usePartyCommand = () => {
  const { startPartyGathering } = usePartyGatheringOrchestration();
  const world = useGameStore((state) => state.game?.world);

  const handlePartyCommand = async (
    description: string | undefined,
    guildId: string | undefined,
  ) => {
    if (!guildId || !world) return;

    try {
      await startPartyGathering({
        guildId,
        world,
        description,
      });
    } catch (error) {
      showRuntimeMessage(getCreatePartyGatheringErrorMessage(error));
    }
  };

  return { handlePartyCommand };
};
