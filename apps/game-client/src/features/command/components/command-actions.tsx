import { Info } from "lucide-react";
import { WindowActionButton } from "@/components/window-action-button";
import { useTranslation } from "react-i18next";

export const CommandActions = () => {
  const { t } = useTranslation("command");

  return (
    <WindowActionButton label={t("actions.infoTooltip")}>
      <Info size={14} aria-hidden="true" />
    </WindowActionButton>
  );
};
