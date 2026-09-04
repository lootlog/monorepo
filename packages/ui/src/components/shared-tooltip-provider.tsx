import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";

type SharedTooltipState = {
  content: ReactNode | null;
  contentClassName?: string;
  open: boolean;
  triggerElement: HTMLElement | null;
  triggerRect: DOMRect | null;
};

type SharedTooltipOptions = {
  contentClassName?: string;
  triggerElement?: HTMLElement | null;
};

type SharedTooltipContextValue = {
  hideTooltip: () => void;
  showTooltip: (
    content: ReactNode,
    triggerRect: DOMRect,
    options?: SharedTooltipOptions,
  ) => void;
};

type SharedTooltipController = SharedTooltipContextValue;

const SHARED_TOOLTIP_OPEN_DELAY = 100;
const SHARED_TOOLTIP_CLOSE_DELAY = 50;

const SharedTooltipContext = createContext<SharedTooltipContextValue | null>(
  null,
);

const createClosedTooltipState = (): SharedTooltipState => ({
  content: null,
  contentClassName: undefined,
  open: false,
  triggerElement: null,
  triggerRect: null,
});

const hasRectChanged = (previousRect: DOMRect | null, nextRect: DOMRect) => {
  if (!previousRect) {
    return true;
  }

  return (
    previousRect.top !== nextRect.top ||
    previousRect.left !== nextRect.left ||
    previousRect.width !== nextRect.width ||
    previousRect.height !== nextRect.height
  );
};

function SharedTooltipRoot({
  controllerRef,
}: {
  controllerRef: RefObject<SharedTooltipController | null>;
}) {
  const [tooltipState, setTooltipState] = useState<SharedTooltipState>(
    createClosedTooltipState,
  );
  const tooltipStateRef = useRef(tooltipState);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    tooltipStateRef.current = tooltipState;
  }, [tooltipState]);

  const clearShowTimeout = () => {
    if (showTimeoutRef.current !== null) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  };

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    controllerRef.current = {
      hideTooltip: () => {
        clearShowTimeout();
        clearHideTimeout();
        hideTimeoutRef.current = window.setTimeout(() => {
          setTooltipState((currentTooltipState) =>
            currentTooltipState.open
              ? createClosedTooltipState()
              : currentTooltipState,
          );
          hideTimeoutRef.current = null;
        }, SHARED_TOOLTIP_CLOSE_DELAY);
      },
      showTooltip: (content, triggerRect, options) => {
        const nextTooltipState: SharedTooltipState = {
          content,
          contentClassName: options?.contentClassName,
          open: true,
          triggerElement: options?.triggerElement ?? null,
          triggerRect,
        };

        clearHideTimeout();

        if (tooltipStateRef.current.open) {
          clearShowTimeout();
          setTooltipState(nextTooltipState);
          return;
        }

        clearShowTimeout();
        showTimeoutRef.current = window.setTimeout(() => {
          setTooltipState(nextTooltipState);
          showTimeoutRef.current = null;
        }, SHARED_TOOLTIP_OPEN_DELAY);
      },
    };

    return () => {
      clearShowTimeout();
      clearHideTimeout();
      controllerRef.current = null;
    };
  }, [controllerRef]);

  useEffect(() => {
    if (!tooltipState.open || !tooltipState.triggerElement) {
      return;
    }

    const syncTriggerRect = () => {
      setTooltipState((currentTooltipState) => {
        if (!currentTooltipState.open || !currentTooltipState.triggerElement) {
          return currentTooltipState;
        }

        if (!currentTooltipState.triggerElement.isConnected) {
          return createClosedTooltipState();
        }

        const nextTriggerRect =
          currentTooltipState.triggerElement.getBoundingClientRect();

        if (!hasRectChanged(currentTooltipState.triggerRect, nextTriggerRect)) {
          return currentTooltipState;
        }

        return {
          ...currentTooltipState,
          triggerRect: nextTriggerRect,
        };
      });
    };

    window.addEventListener("resize", syncTriggerRect);
    document.addEventListener("scroll", syncTriggerRect, true);

    return () => {
      window.removeEventListener("resize", syncTriggerRect);
      document.removeEventListener("scroll", syncTriggerRect, true);
    };
  }, [tooltipState.open, tooltipState.triggerElement]);

  const proxyTriggerStyle = tooltipState.triggerRect
    ? {
        height: tooltipState.triggerRect.height,
        left: tooltipState.triggerRect.left,
        top: tooltipState.triggerRect.top,
        width: tooltipState.triggerRect.width,
      }
    : {
        height: 0,
        left: 0,
        top: 0,
        visibility: "hidden" as const,
        width: 0,
      };

  return (
    <Tooltip
      open={tooltipState.open}
      onOpenChange={(open) => {
        if (!open) {
          clearShowTimeout();
          clearHideTimeout();
          setTooltipState((currentTooltipState) =>
            currentTooltipState.open
              ? createClosedTooltipState()
              : currentTooltipState,
          );
        }
      }}
      disableHoverablePopup
    >
      <TooltipTrigger
        render={
          <span
            aria-hidden="true"
            className="pointer-events-none fixed block"
            style={proxyTriggerStyle}
          />
        }
      />
      <TooltipContent
        className={cn("pointer-events-none", tooltipState.contentClassName)}
      >
        {tooltipState.content}
      </TooltipContent>
    </Tooltip>
  );
}

export function SharedTooltipProvider({ children }: PropsWithChildren) {
  const controllerRef = useRef<SharedTooltipController | null>(null);
  const [contextValue] = useState<SharedTooltipContextValue>(() => ({
    hideTooltip: () => controllerRef.current?.hideTooltip(),
    showTooltip: (content, triggerRect, options) =>
      controllerRef.current?.showTooltip(content, triggerRect, options),
  }));

  return (
    <SharedTooltipContext.Provider value={contextValue}>
      {children}
      <SharedTooltipRoot controllerRef={controllerRef} />
    </SharedTooltipContext.Provider>
  );
}

export const useSharedTooltip = () => useContext(SharedTooltipContext);
