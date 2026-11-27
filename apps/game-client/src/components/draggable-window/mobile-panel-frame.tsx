import { cn } from "cn";
import { Blend, Maximize2, Minimize2, X } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import type { WindowAnimationPhase } from "@/hooks/ui/use-window-presence";
import type { MobilePanelWindowId } from "@/lib/mobile-ui/mobile-windows";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { useWindowsStore, type WindowOpacity } from "@/store/windows.store";
import { useMobilePanelNav } from "./mobile-panel-nav-context";
import {
  useWindowAnimationCancel,
  useWindowFocusLifecycle,
} from "./use-mobile-frame-lifecycle";

const OPACITY_LEVELS: WindowOpacity[] = [1, 2, 3, 4, 5];

const ICON_SIZE = 16;

type MobilePanelFrameProps = {
  id: MobilePanelWindowId;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  closable?: boolean;
  onClose?: () => void;
  animationPhase: WindowAnimationPhase;
  onWindowAnimationEnd: () => void;
};

export const MobilePanelFrame = ({
  id,
  title,
  actions,
  children,
  closable = true,
  onClose,
  animationPhase,
  onWindowAnimationEnd,
}: MobilePanelFrameProps) => {
  const { t } = useTranslation("common");
  const { orientation } = useMobileMode();
  const isPortrait = orientation === "portrait";

  const opacity = useWindowsStore((state) => state[id].opacity);
  const setOpacity = useWindowsStore((state) => state.setOpacity);
  const sheetExpanded = useMobileUiStore((state) => state.sheetExpanded);

  const toggleSheetExpanded = useMobileUiStore(
    (state) => state.toggleSheetExpanded,
  );

  const closePanel = useMobileUiStore((state) => state.closePanel);
  const panelNav = useMobilePanelNav(id);

  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = `ll-${id}-title`;
  const animationPrefix = isPortrait ? "ll-mobile-sheet" : "ll-mobile-drawer";

  useWindowFocusLifecycle(id, animationPhase, dialogRef);
  useWindowAnimationCancel(
    bodyRef,
    animationPhase,
    animationPrefix,
    onWindowAnimationEnd,
  );

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closePanel();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;

    event.stopPropagation();

    if (event.defaultPrevented || !closable) return;

    if (animationPhase === "exit") return;
    event.preventDefault();
    handleClose();
  };

  const handleOpacityCycle = () => {
    const currentIndex = OPACITY_LEVELS.indexOf(opacity);
    const nextIndex = (currentIndex + 1) % OPACITY_LEVELS.length;
    setOpacity(id, OPACITY_LEVELS[nextIndex] ?? 4);
  };

  return (
    <>
      {isPortrait ? (
        <div
          aria-hidden="true"
          data-ll-mobile-backdrop=""
          className={cn(
            "ll:pointer-events-auto ll:fixed ll:inset-0 ll:z-[400] ll:bg-black/35",
            animationPhase === "exit" && "ll:pointer-events-none ll:opacity-0",
          )}
          onClick={(event) => {
            event.stopPropagation();

            if (closable) handleClose();
          }}
        />
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-hidden={animationPhase === "exit" ? true : undefined}
        tabIndex={-1}
        id={`ll-${id}`}
        data-ll-mobile-panel={id}
        data-ll-mobile-orientation={orientation}
        className={cn(
          "ll:pointer-events-auto ll:fixed ll:z-[410] ll:outline-none",
          isPortrait
            ? cn(
                "ll:inset-x-0 ll:bottom-0",
                sheetExpanded ? "ll:h-[92dvh]" : "ll:h-[68dvh]",
              )
            : "ll:top-0 ll:right-0 ll:bottom-0 ll:w-[min(380px,56dvw)]",
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
            "ll:relative ll:flex ll:size-full ll:flex-col ll:overflow-hidden ll:border ll:border-white/50 ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)]",
            isPortrait
              ? "ll:rounded-t-lg ll:border-b-0"
              : "ll:rounded-l-lg ll:border-y-0 ll:border-r-0",
            {
              [`${animationPrefix}-preparing`]: animationPhase === "preparing",
              [`${animationPrefix}-enter`]: animationPhase === "enter",
              [`${animationPrefix}-exit`]: animationPhase === "exit",
              "ll:[text-shadow:0_0_2px_rgb(0_0_0),0_1px_2px_rgb(0_0_0)]":
                opacity <= 3,
              "ll:bg-black/25": opacity === 1,
              "ll:bg-black/45": opacity === 2,
              "ll:bg-black/70": opacity === 3,
              "ll:bg-black/92": opacity === 4,
              "ll:bg-black": opacity === 5,
            },
          )}
          style={
            isPortrait
              ? undefined
              : { paddingRight: "env(safe-area-inset-right, 0px)" }
          }
          onAnimationEnd={(event) => {
            if (event.currentTarget !== event.target) return;

            if (animationPhase !== "enter" && animationPhase !== "exit") return;

            const expectedAnimationName = `${animationPrefix}-${animationPhase}`;

            if (event.animationName !== expectedAnimationName) return;

            onWindowAnimationEnd();
          }}
        >
          <div className="ll:grid ll:min-h-9 ll:shrink-0 ll:grid-cols-[1fr_auto_1fr] ll:items-center ll:gap-1 ll:border-0 ll:border-b ll:border-solid ll:border-separator-subtle ll:px-1.5 ll:py-1">
            <div className="ll:flex ll:items-center ll:gap-0.5 ll:justify-self-start">
              {actions}
            </div>
            <p
              id={titleId}
              className="ll:m-0 ll:min-w-0 ll:truncate ll:text-center ll:text-xs ll:font-semibold ll:leading-none ll:tracking-wide ll:text-foreground"
            >
              {title}
            </p>
            <div className="ll:flex ll:items-center ll:gap-0.5 ll:justify-self-end">
              {isPortrait ? (
                <IconButton
                  label={
                    sheetExpanded
                      ? t("windowControls.collapseHeight")
                      : t("windowControls.expandHeight")
                  }
                  onClick={toggleSheetExpanded}
                >
                  {sheetExpanded ? (
                    <Minimize2 size={ICON_SIZE} aria-hidden="true" />
                  ) : (
                    <Maximize2 size={ICON_SIZE} aria-hidden="true" />
                  )}
                </IconButton>
              ) : null}
              <IconButton
                label={t("windowControls.opacityLevel", {
                  level: opacity,
                  max: OPACITY_LEVELS.length,
                })}
                onClick={handleOpacityCycle}
              >
                <Blend size={ICON_SIZE} aria-hidden="true" />
              </IconButton>
              {closable ? (
                <IconButton
                  label={t("windowControls.closeWindow")}
                  onClick={handleClose}
                >
                  <X size={ICON_SIZE} aria-hidden="true" />
                </IconButton>
              ) : null}
            </div>
          </div>
          <div className="ll:relative ll:min-h-0 ll:flex-1 ll:overflow-hidden">
            {children}
          </div>
          {panelNav}
        </div>
      </div>
    </>
  );
};
