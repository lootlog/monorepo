import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { SettingsSaveStatus } from "@/features/settings/components/shared/settings-save-status";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useWhatsNew } from "@/features/settings/components/whats-new/use-whats-new";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import { useWindowOpen } from "@/hooks/ui/use-window-open";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useEffectEvent } from "react";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const open = useWindowOpen("settings");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { t } = useTranslation();
  const setOverlayOpen = useSettingsUiStore((state) => state.setOverlayOpen);
  const clearQuery = useSettingsUiStore((state) => state.clearQuery);

  const setSettingsPath = useWindowsStore((state) => state.setSettingsPath);
  const hasUnreadNews = useWhatsNew().unreadIds.length > 0;

  const openOnUnreadNews = useEffectEvent(() => {
    if (hasUnreadNews) setSettingsPath("information", "whats-new");
  });

  useEffect(() => {
    if (!open) return;
    setOverlayOpen(false);
    clearQuery();
    openOnUnreadNews();
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
