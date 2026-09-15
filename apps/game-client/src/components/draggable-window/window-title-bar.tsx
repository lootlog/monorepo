import type { FC } from "react";
import { Blend, Lock, Unlock, X } from "lucide-react";
import { WindowActionButton } from "@/components/draggable-window/window-action-button";
import type { WindowOpacity } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

const OPACITY_LEVELS: WindowOpacity[] = [1, 2, 3, 4, 5];

const ICON_SIZE = 14;

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

/**
 * Window-specific actions lead, window controls trail, and the title sits in
 * the middle column so it stays centered and truncates before anything
 * overlaps at narrow widths.
 */
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

  const lockLabel = isLocked
    ? t("windowControls.unlockWindow")
    : t("windowControls.lockWindow");

  return (
    <div
      className="ll:grid ll:h-6 ll:shrink-0 ll:grid-cols-[1fr_auto_1fr] ll:items-center ll:gap-1 ll:px-0.5"
      onPointerDown={onPointerDown}
      style={{ touchAction: "none" }}
    >
      <div
        className="ll:flex ll:items-center ll:gap-0.5 ll:justify-self-start"
        data-ll-draggable="false"
      >
        {actions}
      </div>
      <p className="ll:min-w-0 ll:truncate ll:text-center ll:text-xs ll:font-semibold ll:leading-none ll:tracking-wide ll:text-gray-100">
        {title}
      </p>
      <div
        className="ll:flex ll:items-center ll:gap-0.5 ll:justify-self-end"
        data-ll-draggable="false"
      >
        <WindowActionButton
          label={t("windowControls.changeOpacity")}
          onClick={handleOpacityChange}
        >
          <Blend size={ICON_SIZE} aria-hidden="true" />
        </WindowActionButton>
        <WindowActionButton
          label={lockLabel}
          active={isLocked}
          onClick={onLockToggle}
        >
          {isLocked ? (
            <Lock size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <Unlock size={ICON_SIZE} aria-hidden="true" />
          )}
        </WindowActionButton>
        {closable && (
          <WindowActionButton
            label={t("windowControls.closeWindow")}
            onClick={() => onClose?.()}
          >
            <X size={16} aria-hidden="true" />
          </WindowActionButton>
        )}
      </div>
    </div>
  );
};
