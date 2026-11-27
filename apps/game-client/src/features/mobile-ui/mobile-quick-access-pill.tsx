import { cn } from "cn";
import { GripVertical, LoaderCircle, LogIn, Wifi, WifiOff } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CONNECTION_STATUS_TONE,
  CONNECTION_TONE_TEXT_CLASS_NAME,
  SIGNED_OUT_CONNECTION_TONE,
} from "@/components/connection-status-tone";
import { COUNT_BADGE_CLASS_NAME } from "@/components/count-badge";
import { useSocket } from "@/contexts/socket-context";
import { useAccountOwnedReadyRoom } from "@/features/party-finder/hooks/use-ready-rooms";
import { useQuickAccessItems } from "@/features/quick-access/hooks/use-quick-access-items";
import { useSignInRequired } from "@/hooks/auth/use-login-state";
import { useCountBump } from "@/hooks/ui/use-count-bump";
import { useDrag } from "@/hooks/ui/use-drag";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import {
  clampToViewport,
  useWindowViewport,
  type WindowSize,
} from "@/hooks/ui/window-viewport";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { useMobileUiStore } from "@/store/mobile-ui.store";

const STATUS_ICON = {
  online: {
    Icon: Wifi,
    className: CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.online],
  },
  connecting: {
    Icon: LoaderCircle,
    className: cn(
      CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.connecting],
      "ll:animate-spin ll:motion-reduce:animate-none",
    ),
  },
  reconnecting: {
    Icon: WifiOff,
    className:
      CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.reconnecting],
  },
  unreachable: {
    Icon: WifiOff,
    className:
      CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.unreachable],
  },
} as const satisfies Record<
  RealtimeConnectionStatus,
  { Icon: typeof Wifi; className: string }
>;

const SIGNED_OUT_ICON = {
  Icon: LogIn,
  className: CONNECTION_TONE_TEXT_CLASS_NAME[SIGNED_OUT_CONNECTION_TONE],
};

const DEFAULT_PILL_SIZE: WindowSize = { width: 120, height: 40 };

const EDGE_MARGIN = 12;

const PORTRAIT_BOTTOM_OFFSET = 56;

export const MobileQuickAccessPill = () => {
  const { t } = useTranslation("quickAccess");
  const { orientation } = useMobileMode();
  const viewport = useWindowViewport();
  const { status } = useSocket();
  const signedOut = useSignInRequired();
  const { totalBadgeCount } = useQuickAccessItems();
  const badgeRef = useCountBump<HTMLSpanElement>(totalBadgeCount);

  const activePanel = useMobileUiStore((state) => state.activePanel);
  const hasReadyRoom = useAccountOwnedReadyRoom() !== null;

  const isPanelVisible =
    activePanel !== null && (activePanel !== "party-finder" || hasReadyRoom);

  const pillPosition = useMobileUiStore((state) => state.pillPosition);
  const openLastPanel = useMobileUiStore((state) => state.openLastPanel);
  const setPillPosition = useMobileUiStore((state) => state.setPillPosition);

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

  const { Icon, className: iconClassName } = signedOut
    ? SIGNED_OUT_ICON
    : STATUS_ICON[status];

  return (
    <div
      ref={pillRef}
      data-ll-mobile-pill=""
      className={cn(
        "ll:pointer-events-auto ll:absolute ll:z-[400] ll:flex ll:items-center ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/85 ll:text-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)]",
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
        className="ll:flex ll:h-10 ll:w-7 ll:shrink-0 ll:cursor-grab ll:items-center ll:justify-center ll:text-muted-foreground ll:touch-none"
        onPointerDown={handlePointerDown}
      >
        <GripVertical className="ll:size-4" />
      </div>
      <button
        type="button"
        data-ll-draggable="false"
        aria-label={t("mobile.openMenu")}
        className="ll-custom-cursor-pointer ll:flex ll:h-10 ll:items-center ll:gap-2 ll:rounded-r-lg ll:bg-transparent ll:pr-3 ll:pl-0.5 ll:text-xs ll:font-semibold ll:tracking-wide ll:text-foreground ll:outline-none ll:active:scale-96 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
        onClick={() => openLastPanel()}
      >
        <Icon
          aria-hidden="true"
          className={cn("ll:size-4 ll:shrink-0", iconClassName)}
        />
        <span>{t("window.title")}</span>
        {totalBadgeCount > 0 ? (
          <span
            ref={badgeRef}
            key={totalBadgeCount}
            aria-hidden="true"
            className={cn(COUNT_BADGE_CLASS_NAME, "ll:ring-1 ll:ring-black/80")}
          >
            {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
          </span>
        ) : null}
      </button>
    </div>
  );
};
