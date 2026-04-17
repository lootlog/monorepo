import {
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const getScale = () => {
  if (typeof window.getZoomFactor === "function") {
    return window.getZoomFactor();
  }
  return window.visualViewport?.scale ?? 1;
};

const DEFAULT_STATE = { x: 0, y: 0 };
const DEFAULT_DRAG_INFO = {
  offsetX: 0,
  offsetY: 0,
  width: 0,
  height: 0,
};

let dragSessionCounter = 0;
let activeDragSessionId: number | null = null;

const getTouchByIdentifier = (touchList: TouchList, identifier: number) => {
  for (let i = 0; i < touchList.length; i += 1) {
    const touch = touchList.item(i);
    if (touch && touch.identifier === identifier) {
      return touch;
    }
  }
  return null;
};

const hasTouchIdentifier = (touchList: TouchList, identifier: number) => {
  return getTouchByIdentifier(touchList, identifier) !== null;
};

type UseDragConfig = {
  ref: React.RefObject<HTMLDivElement | null>;
  calculateFor?: "topLeft" | "bottomRight";
  defaultState?: { x: number; y: number };
  onDragStop: (position: { x: number; y: number }) => void;
  isLocked?: boolean;
};

export const useDrag = ({
  ref,
  calculateFor = "topLeft",
  defaultState = DEFAULT_STATE,
  onDragStop,
  isLocked = false,
}: UseDragConfig) => {
  const [dragInfo, setDragInfo] = useState(DEFAULT_DRAG_INFO);
  const [finalPosition, setFinalPosition] = useState(defaultState);
  const [isDragging, setIsDragging] = useState(false);
  const [wasJustDragging, setWasJustDragging] = useState(false);
  const activeTouchIdRef = useRef<number | null>(null);
  const dragSessionRef = useRef<number | null>(null);

  const updateFinalPosition = useCallback(
    (width: number, height: number, x: number, y: number) => {
      const scale = getScale();
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;

      const scaledViewportWidth = viewportWidth * scale;
      const scaledViewportHeight = viewportHeight * scale;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      let newPos: { x: number; y: number };
      if (calculateFor === "bottomRight") {
        newPos = {
          x: Math.max(
            Math.min(
              scaledViewportWidth - scaledWidth,
              scaledViewportWidth - (x + scaledWidth),
            ),
            0,
          ),
          y: Math.max(
            Math.min(
              scaledViewportHeight - scaledHeight,
              scaledViewportHeight - (y + scaledHeight),
            ),
            0,
          ),
        };
      } else {
        newPos = {
          x: Math.min(Math.max(0, x), scaledViewportWidth - scaledWidth),
          y: Math.min(Math.max(0, y), scaledViewportHeight - scaledHeight),
        };
      }
      setFinalPosition(newPos);
    },
    [calculateFor],
  );

  const startDrag = (x: number, y: number) => {
    if (isLocked) return;
    const { current } = ref;
    if (!current) return;
    const { width, height } = current.getBoundingClientRect();
    const sessionId = ++dragSessionCounter;

    activeDragSessionId = sessionId;
    dragSessionRef.current = sessionId;
    setIsDragging(true);
    setDragInfo({
      offsetX: x - finalPosition.x,
      offsetY: y - finalPosition.y,
      width,
      height,
    });
  };

  const dragTo = useCallback(
    (x: number, y: number) => {
      if (!isDragging) return;
      if (
        dragSessionRef.current === null ||
        dragSessionRef.current !== activeDragSessionId
      ) {
        return;
      }
      const { offsetX, offsetY, width, height } = dragInfo;

      updateFinalPosition(width, height, x - offsetX, y - offsetY);
    },
    [isDragging, dragInfo, updateFinalPosition],
  );

  const endDrag = useCallback(() => {
    activeTouchIdRef.current = null;
    if (
      dragSessionRef.current !== null &&
      dragSessionRef.current === activeDragSessionId
    ) {
      activeDragSessionId = null;
    }
    dragSessionRef.current = null;
    if (isDragging) {
      setWasJustDragging(true);
      setIsDragging(false);
    }
  }, [isDragging]);

  const cancelDrag = useCallback(() => {
    activeTouchIdRef.current = null;
    if (
      dragSessionRef.current !== null &&
      dragSessionRef.current === activeDragSessionId
    ) {
      activeDragSessionId = null;
    }
    dragSessionRef.current = null;
    if (isDragging) {
      onDragStop(finalPosition);
      setIsDragging(false);
      setWasJustDragging(true);
    }
  }, [isDragging, finalPosition, onDragStop]);

  const handleMouseDown = (evt: ReactMouseEvent<HTMLElement>) => {
    if (isLocked) return;
    if (!(evt.target instanceof HTMLElement)) return;
    if (evt.target.getAttribute("data-state") === "input") return;
    if (evt.target.getAttribute("data-slot") === "hidden") return;
    if (evt.target.closest("[data-ll-draggable='false']")) return;

    evt.stopPropagation();
    startDrag(evt.clientX, evt.clientY);
  };

  const handleTouchStart = (evt: ReactTouchEvent<HTMLElement>) => {
    if (isLocked) return;
    if (evt.touches.length > 1) return;
    if (!(evt.target instanceof HTMLElement)) return;
    if (evt.target.getAttribute("data-state") === "input") return;
    if (evt.target.getAttribute("data-slot") === "hidden") return;
    if (evt.target.closest("[data-ll-draggable='false']")) return;
    const touch = evt.touches[0];
    activeTouchIdRef.current = touch.identifier;
    evt.stopPropagation();
    const scale = getScale();
    const clientX = (touch.pageX - window.scrollX) * scale;
    const clientY = (touch.pageY - window.scrollY) * scale;
    startDrag(clientX, clientY);
  };

  const handleMouseMove = useCallback(
    (evt: MouseEvent) => {
      if (!isDragging) return;
      if ((evt.buttons & 1) === 0) {
        endDrag();
        return;
      }
      evt.preventDefault();
      dragTo(evt.clientX, evt.clientY);
    },
    [isDragging, dragTo, endDrag],
  );

  const handleTouchMove = useCallback(
    (evt: TouchEvent) => {
      if (!isDragging || evt.touches.length > 1) return;
      const activeTouchId = activeTouchIdRef.current;
      const touch =
        activeTouchId === null
          ? evt.touches[0]
          : getTouchByIdentifier(evt.touches, activeTouchId);
      if (!touch) return;
      evt.preventDefault();
      const scale = getScale();
      const clientX = (touch.pageX - window.scrollX) * scale;
      const clientY = (touch.pageY - window.scrollY) * scale;
      dragTo(clientX, clientY);
    },
    [isDragging, dragTo],
  );

  const handleMouseUp = useCallback(() => endDrag(), [endDrag]);
  const handleTouchEnd = useCallback(
    (evt: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current;
      if (activeTouchId !== null) {
        const activeTouchStillPresent = hasTouchIdentifier(
          evt.touches,
          activeTouchId,
        );
        if (activeTouchStillPresent) return;
      } else if (evt.touches.length > 0 && isDragging) {
        return;
      }
      endDrag();
    },
    [endDrag, isDragging],
  );

  const handleTouchCancel = useCallback(
    (evt: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current;
      if (activeTouchId !== null) {
        const activeTouchStillPresent = hasTouchIdentifier(
          evt.touches,
          activeTouchId,
        );
        if (activeTouchStillPresent) return;
      }
      endDrag();
    },
    [endDrag],
  );

  useEffect(() => {
    if (wasJustDragging && !isDragging) {
      onDragStop(finalPosition);
      setWasJustDragging(false);
    }
  }, [isDragging, wasJustDragging, finalPosition, onDragStop]);

  useEffect(() => {
    if (isLocked) return;
    let timeoutId: number | undefined;

    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        if (isLocked) return;
        const { current: draggableElement } = ref;
        if (!draggableElement) return;
        const { width, height } = draggableElement.getBoundingClientRect();
        setFinalPosition((prev) => {
          const x = Math.min(Math.max(0, prev.x), window.innerWidth - width);
          const y = Math.min(Math.max(0, prev.y), window.innerHeight - height);
          if (x !== prev.x || y !== prev.y) {
            setTimeout(() => onDragStop({ x, y }), 0);
          }
          return { x, y };
        });
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [ref, isLocked, onDragStop]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchCancel);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    handleMouseMove,
    handleTouchMove,
    handleMouseUp,
    handleTouchEnd,
    handleTouchCancel,
  ]);

  useEffect(() => {
    const handleGlobalMouseDown = (evt: MouseEvent) => {
      if (!isDragging) return;
      const current = ref.current;
      if (!current) return;
      if (!(evt.target instanceof Node)) return;
      if (!current.contains(evt.target)) {
        cancelDrag();
      }
    };

    const handleGlobalTouchStart = (evt: TouchEvent) => {
      if (!isDragging) return;
      const current = ref.current;
      if (!current) return;
      if (!(evt.target instanceof Node)) {
        cancelDrag();
        return;
      }
      if (!current.contains(evt.target)) {
        cancelDrag();
      }
    };

    const handleWindowBlur = () => {
      if (isDragging) {
        cancelDrag();
      }
    };

    document.addEventListener("mousedown", handleGlobalMouseDown, true);
    document.addEventListener("touchstart", handleGlobalTouchStart, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("mousedown", handleGlobalMouseDown, true);
      document.removeEventListener("touchstart", handleGlobalTouchStart, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isDragging, cancelDrag, ref]);

  // Usunięto clampowanie pozycji i setFinalPosition z efektu mount/ref

  const recalculate = (width: number, height: number) => {
    const { current } = ref;
    if (!current) return;
    const { top, left, width: w, height: h } = current.getBoundingClientRect();
    updateFinalPosition(width ?? w, height ?? h, left, top);
  };

  return {
    position: finalPosition,
    handleMouseDown,
    handleTouchStart,
    recalculate,
    isDragging,
    cancelDrag,
  };
};
