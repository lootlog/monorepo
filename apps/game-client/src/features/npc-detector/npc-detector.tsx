import { DraggableWindow } from "@/components/draggable-window";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useGlobalStore } from "@/store/global.store";
import { PickedNpcType, useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";

export const NpcDetector = () => {
  const {
    "npc-detector": { open },
    setOpen,
  } = useWindowsStore();
  const { npcs, clearNpcs, settings } = useNpcDetectorStore();

  const handleClose = () => {
    setOpen("npc-detector", false);
    clearNpcs();
  };

  const { characterId } = useGlobalStore((s) => s.gameState);

  const filteredNpcs = npcs.filter((npc) => {
    const npcType = getNpcTypeByWt(npc.wt);
    const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];
    return settingsByNpcType.notifyWindow && settingsByNpcType.detect;
  });

  return (
    open &&
    filteredNpcs.length > 0 && (
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
        <div className="ll-flex ll-flex-col ll-h-full ll-w-full">
          <NpcsList npcs={filteredNpcs} />
        </div>
      </DraggableWindow>
    )
  );
};
