import { DraggableWindow } from "@/components/draggable-window";

import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";

export const Settings = () => {
  const {
    settings: { open },
    setOpen,
  } = useWindowsStore();

  return (
    open && (
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
    )
  );
};
