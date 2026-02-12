import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { Game } from "@/lib/game";
import {
  type DetectorNpcType,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";

export const NpcDetector = () => {
  const open = useWindowsStore((state) => state["npc-detector"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { npcs, clearNpcs, settings } = useNpcDetectorStore();

  const handleClose = () => {
    setOpen("npc-detector", false);
    clearNpcs();
  };

  const characterId = String(Game.hero.id);

  const filteredNpcs = npcs.filter((npc) => {
    const npcType = getNpcTypeByWt(npc.wt);
    const settingsByNpcType = settings[characterId][npcType as DetectorNpcType];
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
        resizable={false}
        minHeight={200}
        maxHeight={400}
        minWidth={360}
        dynamicHeight
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full">
          <NpcsList npcs={filteredNpcs} />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
