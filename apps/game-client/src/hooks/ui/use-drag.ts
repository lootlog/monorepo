import {
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

const DEFAULT_STATE = { x: 0, y: 0 };
const DEFAULT_DRAG_INFO = {
  startX: 0,
  startY: 0,
  top: 0,
  left: 0,
  width: 0,
  height: 0,
};

type UseDragConfig = {
  ref: React.RefObject<HTMLDivElement>;
  calculateFor?: "topLeft" | "bottomRight";
  defaultState?: { x: number; y: number };
  onDragStop: (position: { x: number; y: number }) => void;
};

export const useDrag = ({
  ref,
  calculateFor = "topLeft",
  defaultState = DEFAULT_STATE,
  onDragStop,
}: UseDragConfig) => {
  const [dragInfo, setDragInfo] = useState(DEFAULT_DRAG_INFO);
  const [finalPosition, setFinalPosition] = useState(defaultState);
  const [isDragging, setIsDragging] = useState(false);

  const updateFinalPosition = useCallback(
    (width: number, height: number, x: number, y: number) => {
      if (calculateFor === "bottomRight") {
        setFinalPosition({
          x: Math.max(
            Math.min(
              window.innerWidth - width,
              window.innerWidth - (x + width)
            ),
            0
          ),
          y: Math.max(
            Math.min(
              window.innerHeight - height,
              window.innerHeight - (y + height)
            ),
            0
          ),
        });
        return;
      }

      setFinalPosition({
        x: Math.min(Math.max(0, x), window.innerWidth - width),
        y: Math.min(Math.max(0, y), window.innerHeight - height),
      });
    },
    [calculateFor]
  );

  const startDrag = (x: number, y: number) => {
    const { current } = ref;
    if (!current) return;
    const { top, left, width, height } = current.getBoundingClientRect();

    setIsDragging(true);
    setDragInfo({ startX: x, startY: y, top, left, width, height });
  };

  const dragTo = (x: number, y: number) => {
    if (!isDragging) return;
    const { startX, startY, top, left, width, height } = dragInfo;
    const deltaX = startX - x;
    const deltaY = startY - y;

    updateFinalPosition(width, height, left - deltaX, top - deltaY);
  };

  const endDrag = () => setIsDragging(false);

  const handleMouseDown = (evt: ReactMouseEvent<HTMLElement>) => {
    evt.stopPropagation();
    if (!(evt.target instanceof HTMLElement)) return;
    if (evt.target.getAttribute("data-state") === "input") return;
    if (evt.target.getAttribute("data-slot") === "hidden") return;

    startDrag(evt.clientX, evt.clientY);
  };

  const handleTouchStart = (evt: ReactTouchEvent<HTMLElement>) => {
    if (evt.touches.length > 1) return;
    const touch = evt.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  const handleMouseMove = useCallback(
    (evt: MouseEvent) => {
      if (!isDragging) return;
      evt.preventDefault();
      dragTo(evt.clientX, evt.clientY);
    },
    [isDragging, dragInfo]
  );

  const handleTouchMove = useCallback(
    (evt: TouchEvent) => {
      if (!isDragging || evt.touches.length > 1) return;
      evt.preventDefault();
      dragTo(evt.touches[0].clientX, evt.touches[0].clientY);
    },
    [isDragging, dragInfo]
  );

  const handleMouseUp = () => endDrag();
  const handleTouchEnd = () => endDrag();

  useEffect(() => {
    if (!isDragging) {
      onDragStop(finalPosition);
    }
  }, [isDragging]);

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
  }, [handleMouseMove, handleTouchMove]);

  useEffect(() => {
    const { current } = ref;
    if (!current) return;
    const { width, height } = current.getBoundingClientRect();

    setFinalPosition((prev) => {
      const x = Math.min(Math.max(0, prev.x), window.innerWidth - width);
      const y = Math.min(Math.max(0, prev.y), window.innerHeight - height);
      onDragStop({ x, y });
      return { x, y };
    });
  }, [ref]);

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
  };
};
