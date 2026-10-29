import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";

export const useTimersWorld = () => {
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const defaultWorld = useGameStore((state) => state.game?.world ?? "unknown");

  const { worldByGuildId, allowWorldSelection, guildIdByCharId } =
    useSettingsStore(
      useShallow((state) => ({
        worldByGuildId: state.worldByGuildId,
        allowWorldSelection: state.allowWorldSelection,
        guildIdByCharId: state.guildIdByCharId,
      })),
    );

  const guildId = guildIdByCharId[characterId];
  const selectedWorld = guildId ? worldByGuildId[guildId] : undefined;

  return {
    allowWorldSelection,
    guildId,
    world: selectedWorld && allowWorldSelection ? selectedWorld : defaultWorld,
  };
};
