import { DraggableWindow } from "@/components/draggable-window";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const NpcDetector = () => {
  const {
    "npc-detector": { open },
    setOpen,
  } = useWindowsStore();
  const { npcs, clearNpcs } = useNpcDetectorStore();

  const handleClose = () => {
    setOpen("npc-detector", false);
    clearNpcs();
  };

  return (
    <AnimatePresence>
      {open && npcs.length > 0 && (
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
            minHeight={300}
            minWidth={300}
            dynamicHeight
          >
            <div className="ll-flex ll-flex-col ll-h-full ll-max-h-[300px] ll-w-full">
              <NpcsList />
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
