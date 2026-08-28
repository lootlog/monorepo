import { DraggableWindow } from "@/components/draggable-window";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const open = useWindowsStore((state) => state.settings.open);
  const size = useWindowsStore((state) => state.settings.size);
  const hasDefinedPosition = useWindowsStore(
    (state) => state.settings.hasDefinedPosition,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const setPosition = useWindowsStore((state) => state.setPosition);
  const { t } = useTranslation();
  useLayoutEffect(() => {
    if (!open || hasDefinedPosition) return;

    const centeredPosition = {
      x: Math.round((window.innerWidth - size.width) / 2),
      y: Math.round((window.innerHeight - size.height) / 2),
    };

    setPosition("settings", centeredPosition);
  }, [hasDefinedPosition, open, setPosition, size.height, size.width]);

  return (
    <DraggableWindow
      isOpen={open && hasDefinedPosition}
      id="settings"
      title={t("settings.window.title")}
      onClose={() => setOpen("settings", false)}
      variant="default"
      minHeight={440}
      minWidth={420}
    >
      <SettingsTabs />
    </DraggableWindow>
  );
};
