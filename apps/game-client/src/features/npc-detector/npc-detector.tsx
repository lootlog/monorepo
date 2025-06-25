import { DraggableWindow } from "@/components/draggable-window";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useGlobalStore } from "@/store/global.store";
import { PickedNpcType, useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { AnimatePresence, motion } from "framer-motion";

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
    <AnimatePresence>
      {open && filteredNpcs.length > 0 && (
        <motion.div
          key="npc-detector"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
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
            <div className="ll-flex ll-flex-col ll-h-full ll-w-full">
              <NpcsList npcs={filteredNpcs} />
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
