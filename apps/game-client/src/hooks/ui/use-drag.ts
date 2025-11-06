import {
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
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

type UseDragConfig = {
  ref: React.RefObject<HTMLDivElement>;
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
      const { offsetX, offsetY, width, height } = dragInfo;

      updateFinalPosition(width, height, x - offsetX, y - offsetY);
    },
    [isDragging, dragInfo, updateFinalPosition],
  );

  const endDrag = useCallback(() => {
    if (isDragging) {
      setWasJustDragging(true);
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleMouseDown = (evt: ReactMouseEvent<HTMLElement>) => {
    if (isLocked) return;
    if (!(evt.target instanceof HTMLElement)) return;
    if (evt.target.getAttribute("data-state") === "input") return;
    if (evt.target.getAttribute("data-slot") === "hidden") return;
    if (evt.target.closest("[data-draggable='false']")) return;

    evt.stopPropagation();
    startDrag(evt.clientX, evt.clientY);
  };

  const handleTouchStart = (evt: ReactTouchEvent<HTMLElement>) => {
    if (isLocked) return;
    if (evt.touches.length > 1) return;
    const touch = evt.touches[0];
    const scale = getScale();
    const clientX = (touch.pageX - window.scrollX) * scale;
    const clientY = (touch.pageY - window.scrollY) * scale;
    startDrag(clientX, clientY);
  };

  const handleMouseMove = useCallback(
    (evt: MouseEvent) => {
      if (!isDragging) return;
      evt.preventDefault();
      dragTo(evt.clientX, evt.clientY);
    },
    [isDragging, dragTo],
  );

  const handleTouchMove = useCallback(
    (evt: TouchEvent) => {
      if (!isDragging || evt.touches.length > 1) return;
      evt.preventDefault();
      const scale = getScale();
      const clientX = (evt.touches[0].pageX - window.scrollX) * scale;
      const clientY = (evt.touches[0].pageY - window.scrollY) * scale;
      dragTo(clientX, clientY);
    },
    [isDragging, dragTo],
  );

  const handleMouseUp = useCallback(() => endDrag(), [endDrag]);
  const handleTouchEnd = useCallback(() => endDrag(), [endDrag]);

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

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMouseMove, handleTouchMove, handleMouseUp, handleTouchEnd]);

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
  };
};
