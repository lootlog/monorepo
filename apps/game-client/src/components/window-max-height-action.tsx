import { WindowActionButton } from "@/components/window-action-button";
import { UnfoldVertical } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type WindowMaxHeightActionProps = {
  currentMaxHeight: number;
  isArmed: boolean;
  onClick: () => void;
};

/** Arms the resize handle to set the window's maximum content height. */
export const WindowMaxHeightAction: FC<WindowMaxHeightActionProps> = ({
  currentMaxHeight,
  isArmed,
  onClick,
}) => {
  const { t } = useTranslation("common");

  const tooltip = isArmed
    ? t("windowAutoHeight.armedTooltip")
    : t("windowAutoHeight.idleTooltip", { height: currentMaxHeight });

  return (
    <WindowActionButton
      label={t("windowAutoHeight.maxHeightAria", { height: currentMaxHeight })}
      tooltip={tooltip}
      pressed={isArmed}
      onClick={onClick}
    >
      <UnfoldVertical size={14} aria-hidden="true" />
    </WindowActionButton>
  );
};
