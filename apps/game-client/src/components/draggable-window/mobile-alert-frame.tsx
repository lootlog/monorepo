import { cn } from "cn";
import { X } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import type { WindowAnimationPhase } from "@/hooks/ui/use-window-presence";
import { getMobileAlertStackContainer } from "@/lib/mobile-ui/mobile-alert-stack";
import type { MobileAlertWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useWindowAnimationCancel } from "./use-mobile-frame-lifecycle";

const PORTRAIT_MAX_CONTENT_HEIGHT = 180;

const LANDSCAPE_MAX_CONTENT_HEIGHT = 132;

const ICON_SIZE = 16;

type MobileAlertFrameProps = {
  id: MobileAlertWindowId;
  title: string;
  children: ReactNode;
  closable?: boolean;
  onClose?: () => void;
  contentClassName?: string;
  animationPhase: WindowAnimationPhase;
  onWindowAnimationEnd: () => void;
};

export const MobileAlertFrame = ({
  id,
  title,
  children,
  closable = true,
  onClose,
  contentClassName,
  animationPhase,
  onWindowAnimationEnd,
}: MobileAlertFrameProps) => {
  const { t } = useTranslation("common");
  const { orientation } = useMobileMode();
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = `ll-${id}-title`;

  useWindowAnimationCancel(
    bodyRef,
    animationPhase,
    "ll-window",
    onWindowAnimationEnd,
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;

    event.stopPropagation();

    if (event.defaultPrevented || !closable || !onClose) return;

    if (animationPhase === "exit") return;
    event.preventDefault();
    onClose();
  };

  const maxContentHeight =
    orientation === "landscape"
      ? LANDSCAPE_MAX_CONTENT_HEIGHT
      : PORTRAIT_MAX_CONTENT_HEIGHT;

  const stackContainer = getMobileAlertStackContainer();

  const card = (
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-hidden={animationPhase === "exit" ? true : undefined}
      tabIndex={-1}
      id={`ll-${id}`}
      data-ll-mobile-alert={id}
      className={cn(
        "ll:pointer-events-auto ll:w-full ll:outline-none",
        !stackContainer &&
          "ll:fixed ll:inset-x-2 ll:top-2 ll:z-[420] ll:mx-auto ll:max-w-[440px]",
      )}
      style={{
        contain: "layout style",
        pointerEvents: animationPhase === "exit" ? "none" : undefined,
      }}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={bodyRef}
        className={cn(
          "ll:relative ll:flex ll:w-full ll:flex-col ll:overflow-hidden ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/92 ll:p-1 ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)]",
          {
            "ll-window-preparing": animationPhase === "preparing",
            "ll-window-enter": animationPhase === "enter",
            "ll-window-exit": animationPhase === "exit",
          },
        )}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;

          if (animationPhase !== "enter" && animationPhase !== "exit") return;

          if (event.animationName !== `ll-window-${animationPhase}`) return;

          onWindowAnimationEnd();
        }}
      >
        <div className="ll:flex ll:h-11 ll:shrink-0 ll:items-center ll:justify-between ll:gap-2 ll:px-1.5">
          <p
            id={titleId}
            className="ll:m-0 ll:min-w-0 ll:truncate ll:text-sm ll:font-semibold ll:leading-none ll:tracking-wide ll:text-foreground"
          >
            {title}
          </p>
          {closable ? (
            <IconButton
              label={t("windowControls.closeWindow")}
              onClick={() => onClose?.()}
            >
              <X size={ICON_SIZE} aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>
        <div
          className={cn(
            "ll:relative ll:min-h-0 ll:flex-1 ll:overflow-y-auto",
            contentClassName,
          )}
          style={{ maxHeight: maxContentHeight }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return stackContainer ? createPortal(card, stackContainer) : card;
};
