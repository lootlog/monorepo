import { NpcType } from "@/api/npcs.api";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { getNpcType } from "@lootlog/domain/npc-type";
import { getDetectorNpcSettings } from "@lootlog/schema/account-preferences";

export const useDetectorWindowNpcs = () => {
  const npcs = useNpcDetectorStore((state) => state.npcs);
  const { settings } = useCurrentGameAccountDetectorSettings();

  const windowNpcs = npcs.filter((npc) => {
    const npcType = getNpcType(NpcType, { ...npc, name: npc.nick });
    const settingsByNpcType = getDetectorNpcSettings(settings, npcType);

    return settingsByNpcType?.notifyWindow && settingsByNpcType?.detect;
  });

  return { npcs: windowNpcs, settings };
};
