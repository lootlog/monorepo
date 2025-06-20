import { DraggableWindow } from "@/components/draggable-window";
import { OnlinePlayersList } from "@/features/online-players/components/online-players-list";

import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const OnlinePlayers = () => {
  const {
    "online-players": { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="online-players"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="online-players"
            title="Gracze online"
            onClose={() => setOpen("online-players", false)}
            variant="default"
            minHeight={108}
            minWidth={242}
          >
            <OnlinePlayersList />
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
