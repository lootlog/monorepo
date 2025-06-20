import { DraggableWindow } from "@/components/draggable-window";
import { CreateNpcNotificationForm } from "@/features/notifications/components/create-npc-notification-form";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const CreateNotification = () => {
  const {
    "create-notification": { open, state },
    setOpen,
  } = useWindowsStore();

  const handleClose = () => {
    setOpen("create-notification", false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="create-notification"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="create-notification"
            title="Stwórz powiadomienie"
            onClose={handleClose}
            resizable={false}
            minHeight={300}
            dynamicHeight
          >
            <div className="ll-flex ll-flex-col ll-h-full ll-max-h-[300px] ll-w-full">
              <CreateNpcNotificationForm npc={state.npc} />
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
