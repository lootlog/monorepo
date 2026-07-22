import { useDrag } from "@/hooks/ui/use-drag";
import type { WindowAnimationPhase } from "@/hooks/ui/use-window-presence";
import { cn } from "@/lib/utils";
import {
  useWindowsStore,
  type WindowId,
  type WindowOpacity,
} from "@/store/windows.store";
import {
  type FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { WindowTitleBar } from "./window-title-bar";
import {
  cancelWindowResizeSession,
  WindowResizeHandle,
} from "./window-resize-handle";

export type DraggableWindowFrameProps = {
  children: React.ReactNode;
  id: WindowId;
  actions?: React.ReactNode;
  title: string;
  onClose?: () => void;
  variant?: "default" | "small";
  heightMode?: "fixed" | "auto-up-to-max" | "css-auto-up-to-max";
  widthMode?: "fixed" | "fit-content";
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxContentHeight?: number;
  isMaxHeightAdjustmentArmed?: boolean;
  onMaxHeightAdjustmentArmedChange?: (armed: boolean) => void;
  onMaxContentHeightChange?: (height: number) => void;
  onResolvedMaxContentHeightChange?: (height: number) => void;
  dynamicHeight?: boolean;
  closable?: boolean;
  disableTitle?: boolean;
  draggableContent?: boolean;
  contentClassName?: string;
  animationPhase: WindowAnimationPhase;
  onWindowAnimationEnd: () => void;
};

const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-ll-scroll-area-viewport]";
const MAX_HEIGHT_PREVIEW_LINE_HEIGHT = 1;
const TRANSFORMED_MEASUREMENT_TOLERANCE = 4;

const getDeepestSingleChildElement = (element: HTMLElement) => {
  let currentElement = element;

  while (currentElement.childElementCount === 1) {
    const nextElement = currentElement.firstElementChild;

    if (!(nextElement instanceof HTMLElement)) {
      break;
    }

    currentElement = nextElement;
  }

  return currentElement;
};

const getScrollAreaViewports = (contentElement: HTMLDivElement) =>
  Array.from(
    contentElement.querySelectorAll<HTMLElement>(SCROLL_AREA_VIEWPORT_SELECTOR),
  );

const getContentMeasurementElements = (
  contentElement: HTMLDivElement,
  scrollAreaViewports = getScrollAreaViewports(contentElement),
) => {
  const measurementElements = new Set<HTMLElement>();

  if (scrollAreaViewports.length > 0) {
    scrollAreaViewports.forEach((viewportElement) => {
      measurementElements.add(viewportElement);

      const viewportContent = viewportElement.firstElementChild;

      if (viewportContent instanceof HTMLElement) {
        measurementElements.add(viewportContent);
      }
    });

    return Array.from(measurementElements);
  }

  const contentRoot = contentElement.firstElementChild;

  if (contentRoot instanceof HTMLElement) {
    measurementElements.add(getDeepestSingleChildElement(contentRoot));
  }

  if (measurementElements.size === 0) {
    measurementElements.add(contentElement);
  }

  return Array.from(measurementElements);
};

const getMeasuredContentHeight = (
  contentElement: HTMLDivElement,
  scrollAreaViewports = getScrollAreaViewports(contentElement),
) => {
  if (scrollAreaViewports.length > 0) {
    return scrollAreaViewports.reduce((maxScrollHeight, viewportElement) => {
      const viewportContent = viewportElement.firstElementChild;
      let nextMeasuredHeight = viewportElement.scrollHeight;

      if (viewportContent instanceof HTMLElement) {
        const renderedHeight = Math.ceil(
          viewportContent.getBoundingClientRect().height,
        );
        const scrollHeight = viewportContent.scrollHeight;
        const isSmallTransformedUndershoot =
          renderedHeight > 0 &&
          scrollHeight > renderedHeight &&
          scrollHeight - renderedHeight <= TRANSFORMED_MEASUREMENT_TOLERANCE;

        nextMeasuredHeight = isSmallTransformedUndershoot
          ? scrollHeight
          : renderedHeight || scrollHeight;
      }

      return Math.max(maxScrollHeight, nextMeasuredHeight);
    }, 0);
  }

  const measurementElements = getContentMeasurementElements(
    contentElement,
    scrollAreaViewports,
  );
  let maxScrollHeight = 0;

  for (const element of measurementElements) {
    maxScrollHeight = Math.max(maxScrollHeight, element.scrollHeight);
  }

  return maxScrollHeight;
};

const getMeasuredContentWidth = (contentElement: HTMLDivElement) => {
  const measurementElements = getContentMeasurementElements(contentElement);
  let maxScrollWidth = 0;

  for (const element of measurementElements) {
    maxScrollWidth = Math.max(
      maxScrollWidth,
      element.scrollWidth,
      Math.ceil(element.getBoundingClientRect().width),
    );
  }

  return maxScrollWidth;
};

const getWindowHorizontalChromeWidth = (
  windowBody: HTMLDivElement,
  contentElement: HTMLDivElement,
) => Math.max(0, windowBody.offsetWidth - contentElement.clientWidth);

const getNumericStyleValue = (
  styles: CSSStyleDeclaration,
  propertyName: keyof CSSStyleDeclaration,
) => {
  const rawValue = styles[propertyName];

  if (typeof rawValue !== "string") {
    return 0;
  }

  const parsedValue = Number.parseFloat(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const getWindowChromeHeight = ({
  windowBody,
  titleBar,
  fallbackContentHeight,
}: {
  windowBody: HTMLDivElement;
  titleBar: HTMLDivElement | null;
  fallbackContentHeight: number;
}) => {
  const styles = window.getComputedStyle(windowBody);
  const verticalInsets =
    getNumericStyleValue(styles, "paddingTop") +
    getNumericStyleValue(styles, "paddingBottom") +
    getNumericStyleValue(styles, "borderTopWidth") +
    getNumericStyleValue(styles, "borderBottomWidth");
  const titleBarHeight = titleBar?.offsetHeight ?? 0;
  const stableChromeHeight = Math.round(verticalInsets + titleBarHeight);

  if (stableChromeHeight > 0) {
    return stableChromeHeight;
  }

  return Math.max(0, windowBody.offsetHeight - fallbackContentHeight);
};

const sanitizeMaxContentHeight = (height: number | undefined) => {
  if (!Number.isFinite(height ?? Number.NaN)) {
    return undefined;
  }

  return Math.max(1, Math.round(height as number));
};

const getWindowCursor = ({
  isLocked,
  isDragging,
}: {
  isLocked: boolean;
  isDragging: boolean;
}) => {
  if (isLocked) {
    return "default";
  }

  if (isDragging) {
    return "grabbing";
  }

  return "grab";
};

const measureWindowContent = ({
  windowBody,
  contentElement,
  titleBar,
  scrollAreaViewports,
}: {
  windowBody: HTMLDivElement;
  contentElement: HTMLDivElement;
  titleBar: HTMLDivElement | null;
  scrollAreaViewports?: HTMLElement[];
}) => {
  const renderedContentHeight = Math.max(0, contentElement.clientHeight);
  const chromeHeight = getWindowChromeHeight({
    windowBody,
    titleBar,
    fallbackContentHeight: renderedContentHeight,
  });

  return {
    chromeHeight,
    renderedContentHeight,
    measuredContentHeight: getMeasuredContentHeight(
      contentElement,
      scrollAreaViewports,
    ),
  };
};

export const DraggableWindowFrame: FC<DraggableWindowFrameProps> = ({
  children,
  id,
  actions,
  title,
  onClose,
  variant: _variant = "small",
  heightMode = "fixed",
  widthMode = "fixed",
  resizable = true,
  minWidth = 242,
  minHeight = 240,
  maxWidth,
  maxHeight,
  maxContentHeight,
  isMaxHeightAdjustmentArmed = false,
  onMaxHeightAdjustmentArmedChange,
  onMaxContentHeightChange,
  onResolvedMaxContentHeightChange,
  dynamicHeight = false,
  closable = true,
  disableTitle = false,
  draggableContent = false,
  contentClassName,
  animationPhase,
  onWindowAnimationEnd,
}) => {
  const { opacity, rawDefaultPosition, defaultSize, isLocked } =
    useWindowsStore(
      useShallow((state) => ({
        opacity: state[id].opacity,
        rawDefaultPosition: state[id].position,
        defaultSize: state[id].size,
        isLocked: state[id].locked,
      })),
    );
  const windowFocusHistory = useWindowsStore(
    (state) => state.windowFocusHistory,
  );

  const setPositionInStore = useWindowsStore((state) => state.setPosition);
  const setSizeInStore = useWindowsStore((state) => state.setSize);
  const setOpacityInStore = useWindowsStore((state) => state.setOpacity);
  const setLockedInStore = useWindowsStore((state) => state.setLocked);
  const setCurrentWindowFocus = useWindowsStore(
    (state) => state.setCurrentWindowFocus,
  );

  const [localSize, setLocalSize] = useState({
    width: resizable ? defaultSize.width : minWidth,
    height: resizable ? defaultSize.height : minHeight,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [autoHeight, setAutoHeight] = useState(minHeight);
  const [autoWidth, setAutoWidth] = useState(minWidth);
  const autoWidthRef = useRef(minWidth);
  const [previewMaxContentHeight, setPreviewMaxContentHeight] = useState<
    number | null
  >(null);
  const previewMaxContentHeightRef = useRef<number | null>(null);
  const measuredContentHeightRef = useRef(0);
  const renderedContentHeightRef = useRef(0);
  const windowChromeHeightRef = useRef(0);
  const resolvedMaxContentHeightRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const windowBodyRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const isMeasuredAutoHeightMode = heightMode === "auto-up-to-max";
  const isCssAutoHeightMode = heightMode === "css-auto-up-to-max";
  const isAutoHeightMode = isMeasuredAutoHeightMode || isCssAutoHeightMode;
  const isAutoWidthMode = widthMode === "fit-content";
  const resolvedMaxContentHeight = sanitizeMaxContentHeight(maxContentHeight);
  const allowsHorizontalResize = resizable && !isAutoWidthMode;
  const allowsVerticalResize =
    resizable && (!isAutoHeightMode || isMaxHeightAdjustmentArmed);
  const isAdjustingMaxHeight =
    isAutoHeightMode &&
    isMaxHeightAdjustmentArmed &&
    isResizing &&
    previewMaxContentHeight !== null;
  const previewWindowHeight =
    previewMaxContentHeight === null
      ? null
      : Math.max(
          minHeight,
          windowChromeHeightRef.current + previewMaxContentHeight,
        );
  const getEffectiveHeight = () => {
    if (!isAutoHeightMode) {
      return localSize.height;
    }

    if (isAdjustingMaxHeight && previewWindowHeight !== null) {
      return previewWindowHeight;
    }

    return autoHeight;
  };
  const effectiveHeight = getEffectiveHeight();
  const effectiveWidth = isAutoWidthMode ? autoWidth : localSize.width;

  useEffect(() => {
    const windowBody = windowBodyRef.current;
    if (
      !windowBody ||
      (animationPhase !== "enter" && animationPhase !== "exit")
    ) {
      return;
    }

    const expectedAnimationName = `ll-window-${animationPhase}`;
    const handleAnimationCancel = (event: AnimationEvent) => {
      if (
        event.target === windowBody &&
        event.animationName === expectedAnimationName
      ) {
        onWindowAnimationEnd();
      }
    };

    windowBody.addEventListener("animationcancel", handleAnimationCancel);

    return () => {
      windowBody.removeEventListener("animationcancel", handleAnimationCancel);
    };
  }, [animationPhase, onWindowAnimationEnd]);

  const getResolvedMaxContentHeight = useCallback(() => {
    const windowBody = windowBodyRef.current;
    const contentElement = contentRef.current;

    if (!windowBody || !contentElement) {
      return resolvedMaxContentHeight ?? Math.round(localSize.height);
    }

    const { chromeHeight } = measureWindowContent({
      windowBody,
      contentElement,
      titleBar: titleBarRef.current,
    });

    return (
      resolvedMaxContentHeight ??
      sanitizeMaxContentHeight(localSize.height - chromeHeight) ??
      1
    );
  }, [localSize.height, resolvedMaxContentHeight]);

  const getClampedPosition = useCallback(
    (pos: { x: number; y: number }) => {
      if (typeof window === "undefined") return pos;
      const maxX = window.innerWidth - effectiveWidth;
      const maxY = window.innerHeight - effectiveHeight;
      return {
        x: Math.max(0, Math.min(pos.x, maxX)),
        y: Math.max(0, Math.min(pos.y, maxY)),
      };
    },
    [effectiveHeight, effectiveWidth],
  );

  const defaultPosition = isLocked
    ? rawDefaultPosition
    : getClampedPosition(rawDefaultPosition);

  const draggableRef = useRef<HTMLDivElement>(null);

  const onDragStop = useCallback(
    (position: { x: number; y: number }) => {
      setPositionInStore(id, position);
    },
    [id, setPositionInStore],
  );

  const { position, handlePointerDown, isDragging, cancelDrag, recalculate } =
    useDrag({
      ref: draggableRef,
      defaultState: defaultPosition,
      onDragStop,
      isLocked,
    });

  const handleResize = useCallback(
    (newSize: { width: number; height: number }) => {
      if (isAutoHeightMode) {
        setLocalSize((currentSize) => {
          if (Math.abs(currentSize.width - newSize.width) < 1) {
            return currentSize;
          }

          return {
            ...currentSize,
            width: Math.round(newSize.width),
          };
        });

        if (isMaxHeightAdjustmentArmed) {
          const windowBody = windowBodyRef.current;
          const contentElement = contentRef.current;

          if (!windowBody || !contentElement) {
            return;
          }

          const { chromeHeight, measuredContentHeight, renderedContentHeight } =
            measureWindowContent({
              windowBody,
              contentElement,
              titleBar: titleBarRef.current,
            });
          windowChromeHeightRef.current = chromeHeight;
          measuredContentHeightRef.current = measuredContentHeight;
          renderedContentHeightRef.current = renderedContentHeight;
          const nextMaxContentHeight = sanitizeMaxContentHeight(
            newSize.height - chromeHeight,
          );

          if (nextMaxContentHeight === undefined) {
            return;
          }

          previewMaxContentHeightRef.current = nextMaxContentHeight;
          setPreviewMaxContentHeight(nextMaxContentHeight);
          return;
        }

        return;
      }

      setLocalSize(newSize);
    },
    [isAutoHeightMode, isMaxHeightAdjustmentArmed],
  );

  const handleResizeStart = useCallback(() => {
    cancelDrag();
    setCurrentWindowFocus(id);
    setIsResizing(true);

    if (isAutoHeightMode && isMaxHeightAdjustmentArmed) {
      const windowBody = windowBodyRef.current;
      const contentElement = contentRef.current;

      if (windowBody && contentElement) {
        const { chromeHeight, measuredContentHeight, renderedContentHeight } =
          measureWindowContent({
            windowBody,
            contentElement,
            titleBar: titleBarRef.current,
          });
        windowChromeHeightRef.current = chromeHeight;
        measuredContentHeightRef.current = measuredContentHeight;
        renderedContentHeightRef.current = renderedContentHeight;
      }

      const nextResolvedMaxContentHeight = getResolvedMaxContentHeight();

      previewMaxContentHeightRef.current = nextResolvedMaxContentHeight;
      setPreviewMaxContentHeight(nextResolvedMaxContentHeight);
    }
  }, [
    cancelDrag,
    getResolvedMaxContentHeight,
    id,
    isAutoHeightMode,
    isMaxHeightAdjustmentArmed,
    setCurrentWindowFocus,
  ]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    if (
      isAutoHeightMode &&
      isMaxHeightAdjustmentArmed &&
      previewMaxContentHeightRef.current !== null
    ) {
      const nextMaxContentHeight = sanitizeMaxContentHeight(
        previewMaxContentHeightRef.current,
      );

      if (nextMaxContentHeight !== undefined) {
        onMaxContentHeightChange?.(nextMaxContentHeight);
      }
    }
    previewMaxContentHeightRef.current = null;
    setPreviewMaxContentHeight(null);
    if (isMaxHeightAdjustmentArmed) {
      onMaxHeightAdjustmentArmedChange?.(false);
    }
  }, [
    isAutoHeightMode,
    isMaxHeightAdjustmentArmed,
    onMaxContentHeightChange,
    onMaxHeightAdjustmentArmedChange,
  ]);

  const handleOpacityChange = useCallback(
    (newOpacity: WindowOpacity) => {
      setOpacityInStore(id, newOpacity);
    },
    [id, setOpacityInStore],
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    cancelWindowResizeSession();
    handlePointerDown(event as React.PointerEvent<HTMLElement>);
  };

  const onPointerDownCapture = () => {
    setCurrentWindowFocus(id);
  };

  useEffect(() => {
    if (isResizing) return;
    setSizeInStore(id, { height: localSize.height, width: effectiveWidth });
  }, [effectiveWidth, localSize.height, isResizing, id, setSizeInStore]);

  useEffect(() => {
    if (!isMaxHeightAdjustmentArmed) {
      previewMaxContentHeightRef.current = null;
      setPreviewMaxContentHeight(null);
    }
  }, [isMaxHeightAdjustmentArmed]);

  useLayoutEffect(() => {
    if (!isAutoWidthMode) {
      autoWidthRef.current = minWidth;
      setAutoWidth(minWidth);
      return;
    }

    let animationFrameId: number | null = null;
    let observedContentElements = new Set<HTMLElement>();

    const updateAutoWidth = () => {
      const windowBody = windowBodyRef.current;
      const contentElement = contentRef.current;

      if (!windowBody || !contentElement) {
        return;
      }

      const viewportWidth = Math.max(
        1,
        Math.floor(window.visualViewport?.width ?? window.innerWidth),
      );
      const resolvedMaxWidth = Math.min(
        maxWidth ?? viewportWidth,
        viewportWidth,
      );
      const measuredContentWidth = getMeasuredContentWidth(contentElement);
      const horizontalChromeWidth = getWindowHorizontalChromeWidth(
        windowBody,
        contentElement,
      );
      const nextAutoWidth = Math.max(
        1,
        Math.min(
          Math.max(minWidth, measuredContentWidth + horizontalChromeWidth),
          resolvedMaxWidth,
        ),
      );

      if (Math.abs(autoWidthRef.current - nextAutoWidth) < 1) {
        return;
      }

      autoWidthRef.current = nextAutoWidth;
      setAutoWidth(nextAutoWidth);
      recalculate(nextAutoWidth, effectiveHeight);
    };

    const scheduleAutoWidthUpdate = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        updateAutoWidth();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleAutoWidthUpdate);
    const updateObservedContentElements = () => {
      const contentElement = contentRef.current;

      if (!contentElement) {
        observedContentElements.forEach((element) => {
          resizeObserver.unobserve(element);
        });
        observedContentElements = new Set<HTMLElement>();
        return;
      }

      const nextObservedContentElements = new Set(
        getContentMeasurementElements(contentElement),
      );

      observedContentElements.forEach((element) => {
        if (!nextObservedContentElements.has(element)) {
          resizeObserver.unobserve(element);
        }
      });

      nextObservedContentElements.forEach((element) => {
        if (!observedContentElements.has(element)) {
          resizeObserver.observe(element);
        }
      });

      observedContentElements = nextObservedContentElements;
    };
    const mutationObserver = new MutationObserver(() => {
      updateObservedContentElements();
      scheduleAutoWidthUpdate();
    });
    const visualViewport = window.visualViewport;

    if (contentRef.current) {
      mutationObserver.observe(contentRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    window.addEventListener("resize", scheduleAutoWidthUpdate);
    visualViewport?.addEventListener("resize", scheduleAutoWidthUpdate);
    updateObservedContentElements();
    updateAutoWidth();
    scheduleAutoWidthUpdate();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", scheduleAutoWidthUpdate);
      visualViewport?.removeEventListener("resize", scheduleAutoWidthUpdate);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [effectiveHeight, isAutoWidthMode, maxWidth, minWidth, recalculate]);

  useLayoutEffect(() => {
    if (!isMeasuredAutoHeightMode) {
      resolvedMaxContentHeightRef.current = null;
      setAutoHeight(minHeight);
      return;
    }

    let animationFrameId: number | null = null;
    let observedScrollAreaViewports: HTMLElement[] = [];

    const resizeObserver = new ResizeObserver(() => {
      scheduleAutoHeightUpdate();
    });
    const mutationObserver = new MutationObserver(() => {
      updateObservedContentElements();
      scheduleAutoHeightUpdate();
    });
    let observedContentElements = new Set<HTMLElement>();

    const updateAutoHeight = () => {
      const windowBody = windowBodyRef.current;
      const contentElement = contentRef.current;

      if (!windowBody || !contentElement) {
        return;
      }

      const { chromeHeight, measuredContentHeight, renderedContentHeight } =
        measureWindowContent({
          windowBody,
          contentElement,
          titleBar: titleBarRef.current,
          scrollAreaViewports: observedScrollAreaViewports,
        });
      windowChromeHeightRef.current = chromeHeight;
      measuredContentHeightRef.current = measuredContentHeight;
      renderedContentHeightRef.current = renderedContentHeight;
      const nextResolvedMaxContentHeight =
        resolvedMaxContentHeight ??
        sanitizeMaxContentHeight(localSize.height - chromeHeight) ??
        1;

      if (
        resolvedMaxContentHeightRef.current !== nextResolvedMaxContentHeight
      ) {
        resolvedMaxContentHeightRef.current = nextResolvedMaxContentHeight;
        onResolvedMaxContentHeightChange?.(nextResolvedMaxContentHeight);
      }

      const nextAutoHeight = Math.max(
        minHeight,
        Math.min(
          chromeHeight + measuredContentHeight,
          chromeHeight + nextResolvedMaxContentHeight,
        ),
      );

      setAutoHeight((currentHeight) => {
        if (Math.abs(currentHeight - nextAutoHeight) < 1) {
          return currentHeight;
        }

        return nextAutoHeight;
      });
    };

    const scheduleAutoHeightUpdate = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        updateAutoHeight();
      });
    };

    const updateObservedContentElements = () => {
      const contentElement = contentRef.current;

      if (!contentElement) {
        observedContentElements.forEach((element) => {
          resizeObserver.unobserve(element);
        });
        observedContentElements = new Set<HTMLElement>();
        observedScrollAreaViewports = [];
        return;
      }

      observedScrollAreaViewports = getScrollAreaViewports(contentElement);
      const nextObservedContentElements = new Set(
        getContentMeasurementElements(
          contentElement,
          observedScrollAreaViewports,
        ),
      );

      observedContentElements.forEach((element) => {
        if (!nextObservedContentElements.has(element)) {
          resizeObserver.unobserve(element);
        }
      });

      nextObservedContentElements.forEach((element) => {
        if (!observedContentElements.has(element)) {
          resizeObserver.observe(element);
        }
      });

      observedContentElements = nextObservedContentElements;
    };

    if (titleBarRef.current) {
      resizeObserver.observe(titleBarRef.current);
    }

    if (contentRef.current) {
      mutationObserver.observe(contentRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    updateObservedContentElements();
    updateAutoHeight();
    scheduleAutoHeightUpdate();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [
    isMeasuredAutoHeightMode,
    localSize.height,
    localSize.width,
    resolvedMaxContentHeight,
    minHeight,
    onResolvedMaxContentHeightChange,
  ]);

  let style: { width: number; height: number | "auto" } = {
    width: effectiveWidth,
    height: effectiveHeight,
  };

  if (dynamicHeight || isCssAutoHeightMode) {
    style = {
      width: effectiveWidth,
      height:
        isCssAutoHeightMode && isAdjustingMaxHeight ? effectiveHeight : "auto",
    };
  }

  const cssMaxContentHeight = isCssAutoHeightMode
    ? (previewMaxContentHeight ?? resolvedMaxContentHeight)
    : undefined;
  const contentHeight = isAdjustingMaxHeight
    ? (previewMaxContentHeight ?? 0)
    : renderedContentHeightRef.current;
  const measuredContentHeight = measuredContentHeightRef.current;
  const previewShadeOffset =
    previewMaxContentHeight === null
      ? 0
      : Math.max(
          0,
          Math.min(
            contentHeight - MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
            measuredContentHeight,
          ),
        );
  const previewBoundaryOffset =
    previewMaxContentHeight === null
      ? 0
      : Math.max(
          0,
          Math.min(
            contentHeight - MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
            previewMaxContentHeight - MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
          ),
        );

  const handleLockToggle = useCallback(() => {
    setLockedInStore(id, !isLocked);
  }, [id, isLocked, setLockedInStore]);

  const windowZIndex = windowFocusHistory.indexOf(id);
  const zIndex =
    windowZIndex === -1 ? 0 : windowFocusHistory.length - windowZIndex;

  return (
    <div
      aria-hidden={animationPhase === "exit" ? true : undefined}
      className="ll:pointer-events-auto ll:absolute"
      ref={draggableRef}
      data-ll-draggable-window={id}
      style={{
        ...style,
        maxWidth,
        maxHeight,
        top: position.y,
        left: position.x,
        zIndex,
        contain: "layout style",
        cursor: getWindowCursor({ isLocked, isDragging }),
        touchAction: disableTitle || draggableContent ? "none" : undefined,
        pointerEvents: animationPhase === "exit" ? "none" : undefined,
      }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={disableTitle ? onPointerDown : undefined}
      onWheel={(e) => e.stopPropagation()}
      onClick={handleClick}
      id={`ll-${id}`}
    >
      <div
        className={cn(
          "ll:w-full ll:h-full ll:rounded-lg ll:border-solid ll:border ll:border-white/50 ll:p-1 ll:relative ll:box-border ll:text-white ll:flex ll:flex-col",
          {
            "ll-window-preparing": animationPhase === "preparing",
            "ll-window-enter": animationPhase === "enter",
            "ll-window-exit": animationPhase === "exit",
            "ll:bg-black/0": opacity === 1,
            "ll:bg-black/25": opacity === 2,
            "ll:bg-black/50": opacity === 3,
            "ll:bg-black/75": opacity === 4,
            "ll:bg-black": opacity === 5,
            "ll:border-blue-400/80 ll:ring-1 ll:ring-blue-400/60":
              isMaxHeightAdjustmentArmed,
          },
        )}
        ref={windowBodyRef}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;
          if (animationPhase !== "enter" && animationPhase !== "exit") return;

          const expectedAnimationName = `ll-window-${animationPhase}`;
          if (event.animationName !== expectedAnimationName) return;

          onWindowAnimationEnd();
        }}
      >
        {!disableTitle && (
          <div ref={titleBarRef}>
            <WindowTitleBar
              title={title}
              actions={actions}
              closable={closable}
              opacity={opacity}
              isLocked={isLocked}
              onOpacityChange={handleOpacityChange}
              onLockToggle={handleLockToggle}
              onClose={onClose}
              onPointerDown={onPointerDown}
            />
          </div>
        )}
        <div
          ref={contentRef}
          className={cn(
            "ll:flex-1 ll:overflow-hidden ll:cursor-auto ll:relative",
            contentClassName,
          )}
          style={{ maxHeight: cssMaxContentHeight }}
          onPointerDown={
            draggableContent
              ? onPointerDown
              : (event) => event.stopPropagation()
          }
        >
          {isAdjustingMaxHeight && (
            <div
              data-ll-max-height-preview=""
              className="ll:pointer-events-none ll:absolute ll:inset-0 ll:z-10"
            >
              <div className="ll:absolute ll:inset-0 ll:bg-blue-500/8" />
              <div
                className="ll:absolute ll:left-0 ll:right-0 ll:bg-blue-400/20"
                style={{
                  top: previewShadeOffset,
                  bottom: 0,
                }}
              />
              <div
                className="ll:absolute ll:left-0 ll:right-0 ll:bg-blue-300/90 ll:shadow-[0_0_0_1px_rgba(147,197,253,0.45)]"
                style={{
                  top: previewBoundaryOffset,
                  height: MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
                }}
              />
            </div>
          )}
          {children}
        </div>
        {(allowsHorizontalResize || allowsVerticalResize) && !isLocked && (
          <WindowResizeHandle
            minWidth={minWidth}
            minHeight={minHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            allowHorizontalResize={allowsHorizontalResize}
            allowVerticalResize={allowsVerticalResize}
            onResize={handleResize}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
          />
        )}
      </div>
    </div>
  );
};
