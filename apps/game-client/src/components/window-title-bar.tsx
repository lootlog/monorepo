import type { FC } from "react";
import { Blend, Lock, Unlock, XIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WindowOpacity } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

const OPACITY_LEVELS: WindowOpacity[] = [1, 2, 3, 4, 5];

interface WindowTitleBarProps {
  title: string;
  actions?: React.ReactNode;
  closable: boolean;
  opacity: WindowOpacity;
  isLocked: boolean;
  onOpacityChange: (opacity: WindowOpacity) => void;
  onLockToggle: () => void;
  onClose?: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export const WindowTitleBar: FC<WindowTitleBarProps> = ({
  title,
  actions,
  closable,
  opacity,
  isLocked,
  onOpacityChange,
  onLockToggle,
  onClose,
  onPointerDown,
}) => {
  const { t } = useTranslation("common");
  const handleOpacityChange = () => {
    const currentIndex = OPACITY_LEVELS.indexOf(opacity);
    const nextIndex = (currentIndex + 1) % OPACITY_LEVELS.length;
    onOpacityChange(OPACITY_LEVELS[nextIndex]);
  };

  return (
    <div
      className="ll:flex ll:items-center ll:justify-between ll:px-1 ll:shrink-0"
      onPointerDown={onPointerDown}
      style={{ touchAction: "none" }}
    >
      <div
        className="ll:flex ll:items-center ll:gap-1"
        data-ll-draggable="false"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-ll-draggable="false"
              aria-label={t("windowControls.changeOpacity")}
              className="ll-custom-cursor-pointer ll:mt-0.5 ll:text-gray-300 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:inline-flex ll:items-center ll:justify-center ll:bg-transparent ll:border-0 ll:p-0"
              onClick={handleOpacityChange}
            >
              <Blend size="14" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("windowControls.changeOpacity")}</TooltipContent>
        </Tooltip>
        {actions}
      </div>
      <div className="ll:bg-transparent ll:leading-7 ll-custom-cursor-pointer ll:absolute ll:left-1/2 ll:transform ll:-translate-x-1/2 ll:flex ll:gap-2 ll:items-center">
        <p className="ll:text-[12px] ll:text-[beige] ll:[text-shadow:1px_1px_1px_black] ll:top-1">
          {title}
        </p>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-ll-draggable="false"
              aria-label={
                isLocked
                  ? t("windowControls.unlockWindow")
                  : t("windowControls.lockWindow")
              }
              className="ll:absolute ll:-right-5 ll:text-gray-300 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:inline-flex ll:items-center ll:justify-center ll:bg-transparent ll:border-0 ll:p-0"
              onClick={onLockToggle}
            >
              {isLocked ? (
                <Lock size="14" aria-hidden="true" />
              ) : (
                <Unlock size="14" aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isLocked
              ? t("windowControls.unlockWindow")
              : t("windowControls.lockWindow")}
          </TooltipContent>
        </Tooltip>
      </div>
      {closable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-ll-draggable="false"
              aria-label={t("windowControls.closeWindow")}
              className="ll-custom-cursor-pointer ll:text-gray-300 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:inline-flex ll:items-center ll:justify-center ll:bg-transparent ll:border-0 ll:p-0"
              onClick={onClose}
            >
              <XIcon size="18" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("windowControls.closeWindow")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
