import { NpcType } from "@/api/npcs.api";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { getDetectorNpcSettings } from "@lootlog/schema/account-preferences";

/**
 * The detections the detector window lists: those whose NPC type the current
 * game account both detects and routes to the window.
 */
export const useDetectorWindowNpcs = () => {
  const npcs = useNpcDetectorStore((state) => state.npcs);
  const { settings } = useCurrentGameAccountDetectorSettings();

  const windowNpcs = npcs.filter((npc) => {
    const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
    const settingsByNpcType = getDetectorNpcSettings(settings, npcType);

    return settingsByNpcType?.notifyWindow && settingsByNpcType?.detect;
  });

  return { npcs: windowNpcs, settings };
};
