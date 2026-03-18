import { cn } from "@/utils/cn";
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
  type RefObject,
  type ReactNode,
} from "react";

type SharedTooltipState = {
  open: boolean;
  content: ReactNode | null;
  triggerRect: DOMRect | null;
  triggerElement: HTMLElement | null;
  contentClassName?: string;
};

type SharedTooltipOptions = {
  contentClassName?: string;
  triggerElement?: HTMLElement | null;
};

type SharedTooltipContextValue = {
  showTooltip: (
    content: ReactNode,
    triggerRect: DOMRect,
    options?: SharedTooltipOptions,
  ) => void;
  hideTooltip: () => void;
};

type SharedTooltipController = SharedTooltipContextValue;

const SHARED_TOOLTIP_OPEN_DELAY = 100;
const SHARED_TOOLTIP_CLOSE_DELAY = 50;

const SharedTooltipContext = createContext<SharedTooltipContextValue | null>(
  null,
);

const createClosedTooltipState = (): SharedTooltipState => ({
  open: false,
  content: null,
  triggerRect: null,
  triggerElement: null,
  contentClassName: undefined,
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

const SharedTooltipRoot = ({
  controllerRef,
}: {
  controllerRef: RefObject<SharedTooltipController | null>;
}) => {
  const [tooltipState, setTooltipState] = useState<SharedTooltipState>(
    createClosedTooltipState,
  );
  const tooltipStateRef = useRef(tooltipState);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  tooltipStateRef.current = tooltipState;

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

  controllerRef.current = {
    showTooltip: (content, triggerRect, options) => {
      const nextTooltipState: SharedTooltipState = {
        open: true,
        content,
        triggerRect,
        triggerElement: options?.triggerElement ?? null,
        contentClassName: options?.contentClassName,
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
  };

  useEffect(() => {
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
        top: tooltipState.triggerRect.top,
        left: tooltipState.triggerRect.left,
        width: tooltipState.triggerRect.width,
        height: tooltipState.triggerRect.height,
      }
    : {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        visibility: "hidden" as const,
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
      delayDuration={0}
      disableHoverableContent
    >
      <TooltipTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed block"
          style={proxyTriggerStyle}
        />
      </TooltipTrigger>
      <TooltipContent
        className={cn("pointer-events-none", tooltipState.contentClassName)}
      >
        {tooltipState.content}
      </TooltipContent>
    </Tooltip>
  );
};

export const SharedTooltipProvider = ({ children }: PropsWithChildren) => {
  const controllerRef = useRef<SharedTooltipController | null>(null);
  const contextValueRef = useRef<SharedTooltipContextValue | null>(null);

  if (!contextValueRef.current) {
    contextValueRef.current = {
      showTooltip: (content, triggerRect, options) =>
        controllerRef.current?.showTooltip(content, triggerRect, options),
      hideTooltip: () => controllerRef.current?.hideTooltip(),
    };
  }

  return (
    <SharedTooltipContext.Provider value={contextValueRef.current}>
      {children}
      <SharedTooltipRoot controllerRef={controllerRef} />
    </SharedTooltipContext.Provider>
  );
};

export const useSharedTooltip = () => useContext(SharedTooltipContext);
