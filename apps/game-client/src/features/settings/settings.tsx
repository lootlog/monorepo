import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { SettingsSaveStatus } from "@/components/settings/settings-save-status";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const open = useWindowsStore((state) => state.settings.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { t } = useTranslation();
  const setOverlayOpen = useSettingsUiStore((state) => state.setOverlayOpen);
  const clearQuery = useSettingsUiStore((state) => state.clearQuery);

  // Opening the window starts from a clean search state.
  useEffect(() => {
    if (!open) return;
    setOverlayOpen(false);
    clearQuery();
  }, [clearQuery, open, setOverlayOpen]);

  return (
    <DraggableWindow
      isOpen={open}
      id="settings"
      title={t("settings.window.title")}
      onClose={() => setOpen("settings", false)}
      actions=<SettingsSaveStatus />
      variant="default"
      minHeight={440}
      minWidth={420}
    >
      <SettingsTabs />
    </DraggableWindow>
  );
};
