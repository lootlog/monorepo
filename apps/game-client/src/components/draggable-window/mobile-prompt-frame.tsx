import { cn } from "cn";
import { X } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import type { WindowAnimationPhase } from "@/hooks/ui/use-window-presence";
import type { WindowId } from "@/store/windows.store";
import {
  useWindowAnimationCancel,
  useWindowFocusLifecycle,
} from "./use-mobile-frame-lifecycle";

const ICON_SIZE = 16;

type MobilePromptFrameProps = {
  id: WindowId;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  closable?: boolean;
  onClose?: () => void;
  contentClassName?: string;
  animationPhase: WindowAnimationPhase;
  onWindowAnimationEnd: () => void;
};

export const MobilePromptFrame = ({
  id,
  title,
  actions,
  children,
  closable = true,
  onClose,
  contentClassName,
  animationPhase,
  onWindowAnimationEnd,
}: MobilePromptFrameProps) => {
  const { t } = useTranslation("common");
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = `ll-${id}-title`;

  useWindowFocusLifecycle(id, animationPhase, dialogRef);
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

  return (
    <div
      className={cn(
        "ll:pointer-events-auto ll:fixed ll:inset-0 ll:z-[460] ll:flex ll:items-center ll:justify-center ll:bg-black/50 ll:p-3",
        animationPhase === "exit" && "ll:pointer-events-none",
      )}
      onClick={(event) => {
        event.stopPropagation();

        if (event.target === event.currentTarget && closable) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-hidden={animationPhase === "exit" ? true : undefined}
        tabIndex={-1}
        id={`ll-${id}`}
        data-ll-mobile-prompt={id}
        className="ll:max-h-[85dvh] ll:w-[min(380px,calc(100dvw-16px))] ll:outline-none"
        style={{ contain: "layout style" }}
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={bodyRef}
          className={cn(
            "ll:relative ll:flex ll:max-h-[85dvh] ll:w-full ll:flex-col ll:overflow-hidden ll:rounded-lg ll:border ll:border-white/50 ll:bg-black ll:p-1 ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)]",
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
          <div className="ll:grid ll:min-h-9 ll:shrink-0 ll:grid-cols-[1fr_auto_1fr] ll:items-center ll:gap-1 ll:px-1.5">
            <div className="ll:flex ll:items-center ll:justify-self-start">
              {actions}
            </div>
            <p
              id={titleId}
              className="ll:m-0 ll:min-w-0 ll:truncate ll:text-center ll:text-xs ll:font-semibold ll:leading-none ll:tracking-wide ll:text-foreground"
            >
              {title}
            </p>
            <div className="ll:flex ll:items-center ll:justify-self-end">
              {closable ? (
                <IconButton
                  label={t("windowControls.closeWindow")}
                  onClick={() => onClose?.()}
                >
                  <X size={ICON_SIZE} aria-hidden="true" />
                </IconButton>
              ) : null}
            </div>
          </div>
          <div
            className={cn(
              "ll:relative ll:min-h-0 ll:flex-1 ll:overflow-auto",
              contentClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
