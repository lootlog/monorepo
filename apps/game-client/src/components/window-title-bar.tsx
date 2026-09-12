import type { FC } from "react";
import { Blend, Lock, LockOpen, X } from "lucide-react";
import { WindowActionButton } from "@/components/window-action-button";
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
 * Three-column bar: window controls and feature actions on the left (the
 * order Margonem's own windows use), title, close on the right. The side columns
 * never shrink below their content and split the remaining width evenly, so
 * the title stays centred when there is room and truncates instead of being
 * covered when there is not.
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
      className="ll:grid ll:h-7 ll:shrink-0 ll:select-none ll:grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] ll:items-center ll:gap-1 ll:px-0.5"
      onPointerDown={onPointerDown}
      style={{ touchAction: "none" }}
    >
      <div
        className="ll:flex ll:items-center ll:gap-0.5 ll:justify-self-start"
        data-ll-draggable="false"
      >
        <WindowActionButton
          label={t("windowControls.changeOpacity")}
          tooltip={t("windowControls.opacityLevel", {
            level: opacity,
            max: OPACITY_LEVELS.length,
          })}
          onClick={handleOpacityChange}
        >
          <Blend size={ICON_SIZE} aria-hidden="true" />
        </WindowActionButton>
        <WindowActionButton
          label={lockLabel}
          pressed={isLocked}
          onClick={onLockToggle}
        >
          {isLocked ? (
            <Lock size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <LockOpen size={ICON_SIZE} aria-hidden="true" />
          )}
        </WindowActionButton>
        {actions}
      </div>
      <p
        className="ll:min-w-0 ll:truncate ll:px-1 ll:text-center ll:text-[12px] ll:leading-none ll:font-semibold ll:text-[beige] ll:[text-shadow:1px_1px_1px_black]"
        title={title}
      >
        {title}
      </p>
      <div
        className="ll:flex ll:items-center ll:gap-0.5 ll:justify-self-end"
        data-ll-draggable="false"
      >
        {closable && (
          <WindowActionButton
            label={t("windowControls.closeWindow")}
            destructive
            onClick={onClose}
          >
            <X size={ICON_SIZE} aria-hidden="true" />
          </WindowActionButton>
        )}
      </div>
    </div>
  );
};
