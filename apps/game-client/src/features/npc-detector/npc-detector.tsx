import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import type { DetectorNpcType } from "@lootlog/types";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/hooks/api/use-npcs";

export const NpcDetector = () => {
  const open = useWindowsStore((state) => state["npc-detector"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { npcs, clearNpcs } = useNpcDetectorStore();
  const { settings } = useCurrentGameAccountDetectorSettings();

  const handleClose = () => {
    setOpen("npc-detector", false);
    clearNpcs();
  };

  const filteredNpcs = npcs.filter((npc) => {
    const npcType = getNpcTypeByWt(
      NpcType,
      npc.wt,
      npc.prof,
      npc.type,
    ) as DetectorNpcType;
    const settingsByNpcType = settings[npcType];
    return settingsByNpcType?.notifyWindow && settingsByNpcType?.detect;
  });

  return (
    <AnimatedWindow
      isOpen={open && filteredNpcs.length > 0}
      windowKey="npc-detector"
    >
      <DraggableWindow
        id="npc-detector"
        title="Wykrywacz"
        onClose={handleClose}
        resizable
        minHeight={88}
        maxHeight={600}
        minWidth={242}
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full ll:overflow-hidden">
          <NpcsList npcs={filteredNpcs} />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
