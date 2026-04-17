import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const open = useWindowsStore((state) => state.settings.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { t } = useTranslation();

  return (
    <AnimatedWindow isOpen={open} windowKey="settings">
      <DraggableWindow
        id="settings"
        title={t("settings.window.title")}
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
