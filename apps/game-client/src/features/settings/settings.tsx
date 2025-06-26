import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";

import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";
import { AnimatePresence, motion } from "framer-motion";

export const Settings = () => {
  const {
    settings: { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="settings"
            title="Ustawienia"
            onClose={() => setOpen("settings", false)}
            variant="default"
            minHeight={440}
            minWidth={420}
          >
            <SettingsTabs />
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
