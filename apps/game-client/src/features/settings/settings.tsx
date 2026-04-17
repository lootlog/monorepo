import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useState } from "react";
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
  const [isPositionReady, setIsPositionReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsPositionReady(false);
      return;
    }

    if (hasDefinedPosition) {
      setIsPositionReady(true);
      return;
    }

    const centeredPosition = {
      x: Math.round((window.innerWidth - size.width) / 2),
      y: Math.round((window.innerHeight - size.height) / 2),
    };

    setPosition("settings", centeredPosition);
    setIsPositionReady(true);
  }, [hasDefinedPosition, open, setPosition, size.height, size.width]);

  if (!open || !isPositionReady) {
    return null;
  }

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
