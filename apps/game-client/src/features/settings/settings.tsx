import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";

export const Settings = () => {
  const open = useWindowsStore((state) => state.settings.open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <AnimatedWindow isOpen={open} windowKey="settings">
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
    </AnimatedWindow>
  );
};
