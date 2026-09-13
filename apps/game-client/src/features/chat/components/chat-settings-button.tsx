import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WindowActionButton } from "@/components/window-action-button";

export const ChatSettingsButton = () => {
  const { t } = useTranslation("chat");
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <WindowActionButton
      label={t("actions.openSettings")}
      onClick={() =>
        setOpen("settings", true, {
          activeTab: "chat",
          activeSubsection: "chat-appearance",
        })
      }
    >
      <Settings size={14} aria-hidden="true" />
    </WindowActionButton>
  );
};
