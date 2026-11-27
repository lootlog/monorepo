import { cn } from "cn";
import {
  GripVertical,
  MessageSquareText,
  MessagesSquare,
  Timer,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAccountOwnedReadyRoom } from "@/features/party-finder/hooks/use-ready-rooms";
import { useDrag } from "@/hooks/ui/use-drag";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import {
  clampToViewport,
  useWindowViewport,
  type WindowSize,
} from "@/hooks/ui/window-viewport";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { useWindowsStore } from "@/store/windows.store";
import { MobileMoreMenu } from "./mobile-more-menu";

const DEFAULT_PILL_SIZE: WindowSize = { width: 196, height: 42 };

const EDGE_MARGIN = 12;

const PORTRAIT_BOTTOM_OFFSET = 56;

const PILL_ACTION_CLASS_NAME = "ll:h-10 ll:w-10 ll:rounded-none ll:px-0";

export const MobileQuickAccessPill = () => {
  const { t } = useTranslation("quickAccess");
  const { orientation } = useMobileMode();
  const viewport = useWindowViewport();

  const activePanel = useMobileUiStore((state) => state.activePanel);
  const hasReadyRoom = useAccountOwnedReadyRoom() !== null;

  const isPanelVisible =
    activePanel !== null && (activePanel !== "party-finder" || hasReadyRoom);

  const pillPosition = useMobileUiStore((state) => state.pillPosition);
  const setPillPosition = useMobileUiStore((state) => state.setPillPosition);
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const toggleOpen = useWindowsStore((state) => state.toggleOpen);
  const commandOpen = useWindowsStore((state) => state.command.open);

  const pillRef = useRef<HTMLDivElement>(null);

  const [renderedSize, setRenderedSize] =
    useState<WindowSize>(DEFAULT_PILL_SIZE);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- tracks the pill element's rendered size via ResizeObserver to keep viewport clamping accurate
  useLayoutEffect(() => {
    const element = pillRef.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(-1);

      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);

      setRenderedSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [activePanel]);

  const defaultPosition = {
    x: Math.max(EDGE_MARGIN, viewport.width - renderedSize.width - EDGE_MARGIN),
    y: Math.max(
      EDGE_MARGIN,
      viewport.height -
        renderedSize.height -
        (orientation === "portrait" ? PORTRAIT_BOTTOM_OFFSET : EDGE_MARGIN),
    ),
  };

  const displayPosition = clampToViewport(
    pillPosition ?? defaultPosition,
    renderedSize,
    viewport,
  );

  const { handlePointerDown, isDragging } = useDrag({
    ref: pillRef,
    position: displayPosition,
    onDragStop: setPillPosition,
  });

  if (isPanelVisible) return null;

  return (
    <div
      ref={pillRef}
      role="toolbar"
      aria-label={t("window.title")}
      data-ll-mobile-pill=""
      className={cn(
        "ll:pointer-events-auto ll:absolute ll:z-[400] ll:flex ll:items-center ll:overflow-hidden ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/85 ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)]",
        isDragging && "ll:shadow-[0_10px_24px_rgb(0_0_0/0.55)]",
      )}
      style={{
        left: displayPosition.x,
        top: displayPosition.y,
        contain: "layout style",
      }}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        aria-hidden="true"
        className="ll:flex ll:h-10 ll:w-7 ll:shrink-0 ll:cursor-grab ll:items-center ll:justify-center ll:border-0 ll:border-r ll:border-solid ll:border-separator-subtle ll:text-muted-foreground ll:touch-none"
        onPointerDown={handlePointerDown}
      >
        <GripVertical className="ll:size-4" />
      </div>
      <Button
        type="button"
        variant="taskbar"
        size="sm"
        data-ll-draggable="false"
        data-ll-window-toggle="timers"
        aria-label={t("mobile.nav.timers")}
        className={PILL_ACTION_CLASS_NAME}
        onClick={() => openAndFocus("timers")}
      >
        <Timer aria-hidden="true" className="ll:size-5" />
      </Button>
      <Button
        type="button"
        variant="taskbar"
        size="sm"
        data-ll-draggable="false"
        data-ll-window-toggle="chat"
        aria-label={t("mobile.nav.chat")}
        className={PILL_ACTION_CLASS_NAME}
        onClick={() => openAndFocus("chat")}
      >
        <MessagesSquare aria-hidden="true" className="ll:size-5" />
      </Button>
      <Button
        type="button"
        variant="taskbar"
        size="sm"
        data-ll-draggable="false"
        data-ll-window-toggle="command"
        aria-label={t("mobile.nav.command")}
        aria-pressed={commandOpen}
        className={PILL_ACTION_CLASS_NAME}
        onClick={() => toggleOpen("command")}
      >
        <MessageSquareText aria-hidden="true" className="ll:size-5" />
      </Button>
      <MobileMoreMenu activePanel={null} triggerVariant="pill" />
    </div>
  );
};
