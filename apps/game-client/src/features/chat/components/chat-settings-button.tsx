import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";

export const ChatSettingsButton = () => {
  const { t } = useTranslation("chat");
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);

  return (
    <IconButton
      label={t("actions.openSettings")}
      onClick={() =>
        openAndFocus("settings", {
          activeTab: "chat",
          activeSubsection: "chat-appearance",
        })
      }
    >
      <Settings size={14} aria-hidden="true" />
    </IconButton>
  );
};
