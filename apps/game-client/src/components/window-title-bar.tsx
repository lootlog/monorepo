import { type FC, useCallback } from "react";
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
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
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
  onTouchStart,
}) => {
  const { t } = useTranslation("common");
  const handleOpacityChange = useCallback(() => {
    const currentIndex = OPACITY_LEVELS.indexOf(opacity);
    const nextIndex = (currentIndex + 1) % OPACITY_LEVELS.length;
    onOpacityChange(OPACITY_LEVELS[nextIndex]);
  }, [opacity, onOpacityChange]);

  return (
    <div
      className="ll:flex ll:items-center ll:justify-between ll:px-1 ll:shrink-0"
      onTouchStart={onTouchStart}
    >
      <div
        className="ll:flex ll:items-center ll:gap-1"
        data-ll-draggable="false"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Blend
              data-ll-draggable="false"
              className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
              size="14"
              onClick={handleOpacityChange}
            />
          </TooltipTrigger>
          <TooltipContent>
            {t("common.windowTitleBar.changeOpacity")}
          </TooltipContent>
        </Tooltip>
        {actions}
      </div>
      <div className="ll:bg-transparent ll:leading-7 ll-custom-cursor-pointer ll:absolute ll:left-1/2 ll:transform ll:-translate-x-1/2 ll:flex ll:gap-2 ll:items-center">
        <p className="ll:text-[12px] ll:text-[beige] ll:[text-shadow:1px_1px_1px_black] ll:top-1">
          {title}
        </p>

        <Tooltip>
          <TooltipTrigger asChild>
            {isLocked ? (
              <Lock
                data-ll-draggable="false"
                className="ll:stroke-gray-300 ll:text-xs ll:absolute ll:-right-5 ll:hover:stroke-gray-100 ll:transition-colors"
                size="14"
                onClick={onLockToggle}
              />
            ) : (
              <Unlock
                data-ll-draggable="false"
                className="ll:stroke-gray-300 ll:text-xs ll:absolute ll:-right-5 ll:hover:stroke-gray-100 ll:transition-colors"
                size="14"
                onClick={onLockToggle}
              />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {isLocked
              ? t("common.windowTitleBar.unlockWindow")
              : t("common.windowTitleBar.lockWindow")}
          </TooltipContent>
        </Tooltip>
      </div>
      {closable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <XIcon
              data-ll-draggable="false"
              size="18"
              type="button"
              className="ll-custom-cursor-pointer ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
              onClick={onClose}
            />
          </TooltipTrigger>
          <TooltipContent>
            {t("common.windowTitleBar.closeWindow")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
