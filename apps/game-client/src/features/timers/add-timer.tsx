import { DraggableWindow } from "@/components/draggable-window";
import { AddTimerForm } from "@/features/timers/components/add-timer-form";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const AddTimer = () => {
  const {
    "add-timer": { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-timer"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="add-timer"
            title="Dodaj timer"
            onClose={() => setOpen("add-timer", false)}
            minHeight={300}
          >
            <AddTimerForm />
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
