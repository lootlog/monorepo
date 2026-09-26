import { useDrag } from "@/hooks/ui/use-drag";
import type { WindowAnimationPhase } from "@/hooks/ui/use-window-presence";
import type { WindowSize } from "@/hooks/ui/window-viewport";
import {
  useWindowsStore,
  sanitizeMaxContentHeight,
  type WindowId,
  type WindowOpacity,
} from "@/store/windows.store";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWindowDisplayPosition } from "./use-window-display-position";
import { cancelWindowResizeSession } from "./window-resize-session";

export type DraggableWindowFrameProps = {
  children: React.ReactNode;
  id: WindowId;
  actions?: React.ReactNode;
  title: string;
  onClose?: () => void;
  variant?: "default" | "small";
  heightMode?: "fixed" | "auto-up-to-max";
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
  dynamicHeight?: boolean;
  closable?: boolean;
  disableTitle?: boolean;
  draggableContent?: boolean;
  /**
   * Sizes the window to its content, with a thinner frame and no resize
   * handle, and keeps the stored size for when it expands again.
   */
  collapsed?: boolean;
  contentClassName?: string;
  animationPhase: WindowAnimationPhase;
  onWindowAnimationEnd: () => void;
};

const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-ll-scroll-area-viewport]";

export const MAX_HEIGHT_PREVIEW_LINE_HEIGHT = 1;

const TRANSFORMED_MEASUREMENT_TOLERANCE = 4;

const reconcileObservedElements = (
  observer: ResizeObserver,
  current: Set<HTMLElement>,
  next: Set<HTMLElement>,
) => {
  for (const element of current) {
    if (!next.has(element)) observer.unobserve(element);
  }

  for (const element of next) {
    if (!current.has(element)) observer.observe(element);
  }

  return next;
};

type WindowContentMeasurements = {
  chromeHeight: number;
  measuredContentHeight: number;
  renderedContentHeight: number;
};

/**
 * Moves focus out of a closing window: back to where it came from when that
 * element still exists, otherwise to the page so the game gets keys again.
 * Focus the player already moved elsewhere is left alone.
 */
const releaseWindowFocus = (
  element: HTMLElement,
  returnFocusTo: HTMLElement | null,
) => {
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLElement)) return;

  if (!element.contains(activeElement)) return;

  if (returnFocusTo?.isConnected) {
    returnFocusTo.focus({ preventScroll: true });

    return;
  }

  activeElement.blur();
};

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
        const contentChildren = Array.from(viewportContent.children).filter(
          (element): element is HTMLElement => element instanceof HTMLElement,
        );

        if (contentChildren.length > 0) {
          nextMeasuredHeight = contentChildren.reduce(
            (maxContentHeight, contentChild) => {
              const renderedHeight = Math.ceil(
                contentChild.getBoundingClientRect().height,
              );

              const scrollHeight = contentChild.scrollHeight;

              const isSmallTransformedUndershoot =
                renderedHeight > 0 &&
                scrollHeight > renderedHeight &&
                scrollHeight - renderedHeight <=
                  TRANSFORMED_MEASUREMENT_TOLERANCE;

              const contentChildHeight = isSmallTransformedUndershoot
                ? scrollHeight
                : renderedHeight || scrollHeight;

              return Math.max(
                maxContentHeight,
                contentChild.offsetTop + contentChildHeight,
              );
            },
            0,
          );
        }
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
  propertyName:
    | "paddingTop"
    | "paddingBottom"
    | "borderTopWidth"
    | "borderBottomWidth",
) => {
  const rawValue = styles[propertyName];

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

const measureWindowContent = ({
  windowBody,
  contentElement,
  titleBar,
}: {
  windowBody: HTMLDivElement;
  contentElement: HTMLDivElement;
  titleBar: HTMLDivElement | null;
}): WindowContentMeasurements => {
  const renderedContentHeight = Math.max(0, contentElement.clientHeight);

  const chromeHeight = getWindowChromeHeight({
    windowBody,
    titleBar,
    fallbackContentHeight: renderedContentHeight,
  });

  return {
    chromeHeight,
    renderedContentHeight,
    measuredContentHeight: getMeasuredContentHeight(contentElement),
  };
};

const resolveDraggableWindowFrameProps = (
  props: DraggableWindowFrameProps,
) => ({
  ...props,
  closable: props.closable ?? true,
  disableTitle: props.disableTitle ?? false,
  draggableContent: props.draggableContent ?? false,
  collapsed: props.collapsed ?? false,
  dynamicHeight: props.dynamicHeight ?? false,
  heightMode: props.heightMode ?? "fixed",
  isMaxHeightAdjustmentArmed: props.isMaxHeightAdjustmentArmed ?? false,
  minHeight: props.minHeight ?? 240,
  minWidth: props.minWidth ?? 242,
  resizable: props.resizable ?? true,
  widthMode: props.widthMode ?? "fixed",
});

const resolveWindowResizeState = ({
  chromeHeight,
  heightMode,
  isMaxHeightAdjustmentArmed,
  isResizing,
  minHeight,
  previewMaxContentHeight,
  resizable,
  widthMode,
}: {
  chromeHeight: number;
  heightMode: NonNullable<DraggableWindowFrameProps["heightMode"]>;
  isMaxHeightAdjustmentArmed: boolean;
  isResizing: boolean;
  minHeight: number;
  previewMaxContentHeight: number | null;
  resizable: boolean;
  widthMode: NonNullable<DraggableWindowFrameProps["widthMode"]>;
}) => {
  const isAutoHeightMode = heightMode === "auto-up-to-max";
  const isAutoWidthMode = widthMode === "fit-content";

  const isAdjustingMaxHeight =
    isAutoHeightMode &&
    isMaxHeightAdjustmentArmed &&
    isResizing &&
    previewMaxContentHeight !== null;

  return {
    allowsHorizontalResize: resizable && !isAutoWidthMode,
    allowsVerticalResize:
      resizable && (!isAutoHeightMode || isMaxHeightAdjustmentArmed),
    isAdjustingMaxHeight,
    isAutoHeightMode,
    isAutoWidthMode,
    previewWindowHeight:
      previewMaxContentHeight === null
        ? null
        : Math.max(minHeight, chromeHeight + previewMaxContentHeight),
  };
};

const resolveWindowFrameMeasurements = ({
  autoWidth,
  contentMeasurements,
  dynamicHeight,
  isAdjustingMaxHeight,
  isAutoHeightMode,
  isAutoWidthMode,
  localSize,
  minHeight,
  previewMaxContentHeight,
  previewWindowHeight,
  resolvedMaxContentHeight,
}: {
  autoWidth: number;
  contentMeasurements: WindowContentMeasurements;
  dynamicHeight: boolean;
  isAdjustingMaxHeight: boolean;
  isAutoHeightMode: boolean;
  isAutoWidthMode: boolean;
  localSize: { height: number; width: number };
  minHeight: number;
  previewMaxContentHeight: number | null;
  previewWindowHeight: number | null;
  resolvedMaxContentHeight?: number;
}) => {
  let effectiveHeight = isAutoHeightMode ? minHeight : localSize.height;

  if (isAdjustingMaxHeight && previewWindowHeight !== null) {
    effectiveHeight = previewWindowHeight;
  }

  const effectiveWidth = isAutoWidthMode ? autoWidth : localSize.width;

  // Auto height follows the content in CSS, capped by the content max height;
  // only a max-height adjustment pins it to the previewed height.
  const style = {
    width: effectiveWidth,
    height:
      (isAutoHeightMode || dynamicHeight) && !isAdjustingMaxHeight
        ? "auto"
        : effectiveHeight,
  };

  const contentMaxHeight = isAutoHeightMode
    ? (previewMaxContentHeight ?? resolvedMaxContentHeight)
    : undefined;

  const contentHeight = isAdjustingMaxHeight
    ? (previewMaxContentHeight ?? 0)
    : contentMeasurements.renderedContentHeight;

  const previewShadeOffset =
    previewMaxContentHeight === null
      ? 0
      : Math.max(
          0,
          Math.min(
            contentHeight - MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
            contentMeasurements.measuredContentHeight,
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

  return {
    contentMaxHeight,
    effectiveHeight,
    effectiveWidth,
    previewBoundaryOffset,
    previewShadeOffset,
    style,
  };
};

export function useDraggableWindowFrame(props: DraggableWindowFrameProps) {
  const {
    children,
    id,
    actions,
    title,
    onClose,
    heightMode,
    widthMode,
    resizable,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    maxContentHeight,
    isMaxHeightAdjustmentArmed,
    onMaxHeightAdjustmentArmedChange,
    onMaxContentHeightChange,
    dynamicHeight,
    closable,
    disableTitle,
    draggableContent,
    collapsed,
    contentClassName,
    animationPhase,
    onWindowAnimationEnd,
  } = resolveDraggableWindowFrameProps(props);

  const { opacity, defaultSize, isLocked } = useWindowsStore(
    useShallow((state) => ({
      opacity: state[id].opacity,
      defaultSize: state[id].size,
      isLocked: state[id].locked,
    })),
  );

  // A primitive selector: focus changes elsewhere must not re-render every open window.
  const zIndex = useWindowsStore((state) => {
    const focusIndex = state.windowFocusHistory.indexOf(id);

    return focusIndex === -1 ? 0 : state.windowFocusHistory.length - focusIndex;
  });

  const setPositionInStore = useWindowsStore((state) => state.setPosition);
  const setSizeInStore = useWindowsStore((state) => state.setSize);
  const setOpacityInStore = useWindowsStore((state) => state.setOpacity);
  const setLockedInStore = useWindowsStore((state) => state.setLocked);

  const setCurrentWindowFocus = useWindowsStore(
    (state) => state.setCurrentWindowFocus,
  );

  const focusRequest = useWindowsStore((state) =>
    state.focusRequest?.windowId === id ? state.focusRequest : undefined,
  );

  const clearFocusRequest = useWindowsStore((state) => state.clearFocusRequest);

  const [localSize, setLocalSize] = useState({
    width: resizable ? defaultSize.width : minWidth,
    height: resizable ? defaultSize.height : minHeight,
  });

  const [isResizing, setIsResizing] = useState(false);
  const [autoWidth, setAutoWidth] = useState(minWidth);
  const autoWidthRef = useRef(minWidth);

  const [previewMaxContentHeight, setPreviewMaxContentHeight] = useState<
    number | null
  >(null);

  const previewMaxContentHeightRef = useRef<number | null>(null);
  const windowChromeHeightRef = useRef(0);

  const [contentMeasurements, setContentMeasurements] =
    useState<WindowContentMeasurements>({
      chromeHeight: 0,
      measuredContentHeight: 0,
      renderedContentHeight: 0,
    });

  const contentRef = useRef<HTMLDivElement>(null);
  const windowBodyRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const resolvedMaxContentHeight = sanitizeMaxContentHeight(maxContentHeight);

  const activePreviewMaxContentHeight = isMaxHeightAdjustmentArmed
    ? previewMaxContentHeight
    : null;

  const {
    allowsHorizontalResize,
    allowsVerticalResize,
    isAdjustingMaxHeight,
    isAutoHeightMode,
    isAutoWidthMode,
    previewWindowHeight,
  } = resolveWindowResizeState({
    chromeHeight: contentMeasurements.chromeHeight,
    heightMode,
    isMaxHeightAdjustmentArmed,
    isResizing,
    minHeight,
    previewMaxContentHeight: activePreviewMaxContentHeight,
    resizable: resizable && !collapsed,
    widthMode,
  });

  const {
    contentMaxHeight,
    effectiveHeight,
    effectiveWidth,
    previewBoundaryOffset,
    previewShadeOffset,
    style,
  } = resolveWindowFrameMeasurements({
    autoWidth: isAutoWidthMode ? autoWidth : minWidth,
    contentMeasurements,
    dynamicHeight,
    isAdjustingMaxHeight,
    isAutoHeightMode,
    isAutoWidthMode,
    localSize,
    minHeight,
    previewMaxContentHeight: activePreviewMaxContentHeight,
    previewWindowHeight,
    resolvedMaxContentHeight,
  });

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

  const draggableRef = useRef<HTMLDivElement>(null);

  // Auto-sized windows only know their size after layout; the observer keeps
  // placement and clamping on the size the player actually sees.
  const [renderedSize, setRenderedSize] = useState<WindowSize>({
    width: effectiveWidth,
    height: effectiveHeight,
  });

  useLayoutEffect(() => {
    const element = draggableRef.current;

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
  }, []);

  const position = useWindowDisplayPosition(id, renderedSize);

  const onDragStop = (droppedPosition: { x: number; y: number }) => {
    setPositionInStore(id, droppedPosition);
  };

  const { handlePointerDown, isDragging, cancelDrag } = useDrag({
    ref: draggableRef,
    position,
    onDragStop,
    isLocked,
  });

  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Only a window the player opened on purpose takes focus. Windows that open
  // on their own (detector, notifications) never request it, so typing and
  // game hotkeys keep working when they appear.
  useLayoutEffect(() => {
    if (!focusRequest || animationPhase === "exit") return;
    const element = draggableRef.current;

    if (!element) return;
    const { returnFocusTo } = focusRequest;

    returnFocusRef.current =
      returnFocusTo && !element.contains(returnFocusTo) ? returnFocusTo : null;

    if (!element.contains(document.activeElement)) {
      element.focus({ preventScroll: true });
    }

    clearFocusRequest(id);
  }, [animationPhase, clearFocusRequest, focusRequest, id]);

  useLayoutEffect(() => {
    const element = draggableRef.current;

    if (animationPhase !== "exit" || !element) return;

    releaseWindowFocus(element, returnFocusRef.current);
  }, [animationPhase]);

  useLayoutEffect(() => {
    const element = draggableRef.current;

    return () => {
      if (element) releaseWindowFocus(element, returnFocusRef.current);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;

    // Margonem acts on Escape from any focused element (its first action
    // refuses pending loot), so a key pressed inside a window stays here.
    event.stopPropagation();

    if (event.defaultPrevented || !closable || !onClose) return;

    if (animationPhase === "exit") return;
    event.preventDefault();
    onClose();
  };

  const handleResize = (newSize: { width: number; height: number }) => {
    if (!isAutoHeightMode) {
      setLocalSize(newSize);

      return;
    }

    setLocalSize((currentSize) => {
      if (Math.abs(currentSize.width - newSize.width) < 1) {
        return currentSize;
      }

      return {
        ...currentSize,
        width: Math.round(newSize.width),
      };
    });

    if (!isMaxHeightAdjustmentArmed) return;

    // The window chrome and content were measured when the resize began
    // and do not change while the handle moves; re-measuring here would
    // force a layout on every pointer move.
    const nextMaxContentHeight = sanitizeMaxContentHeight(
      newSize.height - windowChromeHeightRef.current,
    );

    if (nextMaxContentHeight === undefined) return;

    previewMaxContentHeightRef.current = nextMaxContentHeight;
    setPreviewMaxContentHeight(nextMaxContentHeight);
  };

  const handleResizeStart = () => {
    cancelDrag();
    setCurrentWindowFocus(id);
    setIsResizing(true);

    // Default placements derive from the window's own size (centered, or
    // anchored to the map's right edge), so resizing an unplaced window would
    // move its top-left corner with the handle. Resizing places it where it
    // is drawn now, like a drag.
    if (!useWindowsStore.getState()[id].hasDefinedPosition) {
      setPositionInStore(id, position);
    }

    if (!isAutoHeightMode || !isMaxHeightAdjustmentArmed) return;

    const windowBody = windowBodyRef.current;
    const contentElement = contentRef.current;

    if (!windowBody || !contentElement) return;

    const measurements = measureWindowContent({
      windowBody,
      contentElement,
      titleBar: titleBarRef.current,
    });

    windowChromeHeightRef.current = measurements.chromeHeight;
    setContentMeasurements(measurements);

    const initialPreviewMaxContentHeight =
      resolvedMaxContentHeight ??
      sanitizeMaxContentHeight(localSize.height - measurements.chromeHeight) ??
      1;

    previewMaxContentHeightRef.current = initialPreviewMaxContentHeight;
    setPreviewMaxContentHeight(initialPreviewMaxContentHeight);
  };

  const handleResizeEnd = () => {
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
  };

  const handleOpacityChange = (newOpacity: WindowOpacity) => {
    setOpacityInStore(id, newOpacity);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    cancelWindowResizeSession();
    handlePointerDown(event);
  };

  const onPointerDownCapture = () => {
    setCurrentWindowFocus(id);
  };

  useEffect(() => {
    if (isResizing || collapsed) return;
    setSizeInStore(id, { height: localSize.height, width: effectiveWidth });
  }, [
    collapsed,
    effectiveWidth,
    localSize.height,
    isResizing,
    id,
    setSizeInStore,
  ]);

  useLayoutEffect(() => {
    if (!isAutoWidthMode) {
      autoWidthRef.current = minWidth;

      return () => undefined;
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

      observedContentElements = reconcileObservedElements(
        resizeObserver,
        observedContentElements,
        nextObservedContentElements,
      );
    };

    const mutationObserver = new MutationObserver(() => {
      updateObservedContentElements();
      scheduleAutoWidthUpdate();
    });

    const visualViewport = window.visualViewport;

    // Fit-content width follows text, so text edits count here.
    if (contentRef.current) {
      mutationObserver.observe(contentRef.current, {
        characterData: true,
        childList: true,
        subtree: true,
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
  }, [isAutoWidthMode, maxWidth, minWidth]);

  const handleLockToggle = () => {
    setLockedInStore(id, !isLocked);
  };

  return {
    children,
    id,
    actions,
    title,
    onClose,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    isMaxHeightAdjustmentArmed,
    closable,
    disableTitle,
    draggableContent,
    collapsed,
    contentClassName,
    animationPhase,
    onWindowAnimationEnd,
    opacity,
    isLocked,
    contentRef,
    windowBodyRef,
    titleBarRef,
    allowsHorizontalResize,
    allowsVerticalResize,
    isAdjustingMaxHeight,
    contentMaxHeight,
    previewBoundaryOffset,
    previewShadeOffset,
    style: collapsed
      ? { width: "max-content" as const, height: "auto" as const }
      : style,
    draggableRef,
    position,
    isDragging,
    handleResize,
    handleResizeStart,
    handleResizeEnd,
    handleOpacityChange,
    handleClick,
    onPointerDown,
    onPointerDownCapture,
    handleLockToggle,
    handleKeyDown,
    titleId: `ll-${id}-title`,
    zIndex,
  };
}
