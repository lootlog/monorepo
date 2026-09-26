import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  clampToViewport,
  measureWindowViewport,
  type WindowPosition,
  type WindowViewport,
} from "./window-viewport";

/**
 * A drag session measures the viewport once on pointer down and only
 * re-measures when the visual viewport itself resizes (pinch zoom), never per
 * pointer move.
 */
type DragInfo = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  viewport: WindowViewport;
};

const DEFAULT_DRAG_INFO: DragInfo = {
  offsetX: 0,
  offsetY: 0,
  width: 0,
  height: 0,
  viewport: { scale: 1, width: 0, height: 0 },
};

let dragSessionCounter = 0;

let activeDragSessionId: number | null = null;

const getNextDragSessionId = () => {
  dragSessionCounter += 1;

  return dragSessionCounter;
};

type UseDragConfig = {
  ref: React.RefObject<HTMLDivElement | null>;
  /** Where the element is displayed; a drag starts from and moves relative to it. */
  position: WindowPosition;
  /** Receives the dropped position, only when the drag actually moved the element. */
  onDragStop: (position: WindowPosition) => void;
  isLocked?: boolean;
};

/**
 * Moves an element with a coalesced transform while the pointer is down and
 * reports the dropped position once. The caller owns the resting position.
 */
export const useDrag = ({
  ref,
  position,
  onDragStop,
  isLocked = false,
}: UseDragConfig) => {
  const [isDragging, setIsDragging] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragInfoRef = useRef<DragInfo>(DEFAULT_DRAG_INFO);
  const dragSessionRef = useRef<number | null>(null);
  const positionRef = useRef(position);
  const dragOriginPositionRef = useRef(position);
  const draggedPositionRef = useRef<WindowPosition | null>(null);
  const isDraggingRef = useRef(false);
  const hasDragStylesRef = useRef(false);
  const positionFrameRef = useRef<number | null>(null);
  const isLockedRef = useRef(isLocked);
  const onDragStopRef = useRef(onDragStop);

  useEffect(() => {
    positionRef.current = position;
    isLockedRef.current = isLocked;
    onDragStopRef.current = onDragStop;
  }, [position, isLocked, onDragStop]);

  const queuePosition = (x: number, y: number) => {
    const { width, height, viewport } = dragInfoRef.current;
    const { scale } = viewport;

    const nextPosition = clampToViewport(
      { x, y },
      { width: width * scale, height: height * scale },
      viewport,
    );

    const currentPosition =
      draggedPositionRef.current ?? dragOriginPositionRef.current;

    if (
      nextPosition.x === currentPosition.x &&
      nextPosition.y === currentPosition.y
    ) {
      return;
    }

    draggedPositionRef.current = nextPosition;

    if (positionFrameRef.current !== null) return;

    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      const draggedPosition = draggedPositionRef.current;
      const draggableElement = ref.current;

      if (!isDraggingRef.current || !draggedPosition || !draggableElement) {
        return;
      }

      const dragOriginPosition = dragOriginPositionRef.current;
      const translateX = draggedPosition.x - dragOriginPosition.x;
      const translateY = draggedPosition.y - dragOriginPosition.y;
      draggableElement.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    });
  };

  const queuePositionRef = useRef(queuePosition);

  useEffect(() => {
    queuePositionRef.current = queuePosition;
  });

  const finishDrag = () => {
    activePointerIdRef.current = null;

    if (
      dragSessionRef.current !== null &&
      dragSessionRef.current === activeDragSessionId
    ) {
      activeDragSessionId = null;
    }

    dragSessionRef.current = null;

    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;

    if (positionFrameRef.current !== null) {
      window.cancelAnimationFrame(positionFrameRef.current);
      positionFrameRef.current = null;
    }

    const draggedPosition = draggedPositionRef.current;
    draggedPositionRef.current = null;
    setIsDragging(false);

    // A press without movement is not a placement: it must not turn a default
    // position into a saved one.
    if (draggedPosition) {
      onDragStopRef.current(draggedPosition);
    }
  };

  const finishDragRef = useRef(finishDrag);

  useEffect(() => {
    finishDragRef.current = finishDrag;
  });

  const startDrag = (x: number, y: number, viewport: WindowViewport) => {
    if (isLockedRef.current) return false;
    const draggableElement = ref.current;

    if (!draggableElement) return false;
    const { width, height } = draggableElement.getBoundingClientRect();
    const sessionId = getNextDragSessionId();
    const origin = positionRef.current;

    activeDragSessionId = sessionId;
    dragSessionRef.current = sessionId;
    dragInfoRef.current = {
      offsetX: x - origin.x,
      offsetY: y - origin.y,
      width,
      height,
      viewport,
    };
    dragOriginPositionRef.current = origin;
    draggedPositionRef.current = null;
    isDraggingRef.current = true;
    draggableElement.style.willChange = "transform";
    hasDragStylesRef.current = true;
    setIsDragging(true);

    return true;
  };

  const handlePointerDown = (evt: ReactPointerEvent<HTMLElement>) => {
    if (isLockedRef.current) return;

    if (!evt.isPrimary || evt.button !== 0) return;

    // An icon is an SVG element, not an HTMLElement; pressing one inside a
    // drag area must still start the drag.
    if (!(evt.target instanceof Element)) return;

    if (evt.target.getAttribute("data-state") === "input") return;

    if (evt.target.getAttribute("data-slot") === "hidden") return;

    if (evt.target.closest("[data-ll-draggable='false']")) return;

    const viewport = measureWindowViewport();
    const scale = evt.pointerType === "touch" ? viewport.scale : 1;

    if (!startDrag(evt.clientX * scale, evt.clientY * scale, viewport)) return;

    activePointerIdRef.current = evt.pointerId;
    // Cancelling pointerdown suppresses the compatibility mousedown, whose
    // default action would start a text selection that follows the drag.
    evt.preventDefault();
    evt.stopPropagation();
  };

  useEffect(
    () => () => {
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
      }

      if (dragSessionRef.current === activeDragSessionId) {
        activeDragSessionId = null;
      }

      activePointerIdRef.current = null;
      dragSessionRef.current = null;
      isDraggingRef.current = false;
      const draggableElement = ref.current;

      if (draggableElement && hasDragStylesRef.current) {
        draggableElement.style.transform = "";
        draggableElement.style.willChange = "";
      }

      hasDragStylesRef.current = false;
    },
    [ref],
  );

  // The dropped position reaches the caller's state in the same render that
  // ends the drag, so the transform is removed exactly when `left`/`top` move.
  useLayoutEffect(() => {
    if (isDragging || !hasDragStylesRef.current) return;
    const draggableElement = ref.current;

    if (!draggableElement) return;

    draggableElement.style.transform = "";
    draggableElement.style.willChange = "";
    hasDragStylesRef.current = false;
  }, [position, isDragging, ref]);

  useEffect(() => {
    if (!isDragging) return;

    if (isLocked) {
      finishDragRef.current();

      return;
    }

    const handlePointerMove = (evt: PointerEvent) => {
      if (evt.pointerId !== activePointerIdRef.current) return;

      if (evt.pointerType === "mouse" && (evt.buttons & 1) === 0) {
        finishDragRef.current();

        return;
      }

      if (
        dragSessionRef.current === null ||
        dragSessionRef.current !== activeDragSessionId
      ) {
        return;
      }

      evt.preventDefault();
      const { offsetX, offsetY, viewport } = dragInfoRef.current;
      const scale = evt.pointerType === "touch" ? viewport.scale : 1;
      queuePositionRef.current(
        evt.clientX * scale - offsetX,
        evt.clientY * scale - offsetY,
      );
    };

    const handleViewportResize = () => {
      dragInfoRef.current = {
        ...dragInfoRef.current,
        viewport: measureWindowViewport(dragInfoRef.current.viewport.scale),
      };
    };

    const handlePointerEnd = (evt: PointerEvent) => {
      if (evt.pointerId === activePointerIdRef.current) {
        finishDragRef.current();
      }
    };

    const handleGlobalPointerDown = (evt: PointerEvent) => {
      const draggableElement = ref.current;

      if (!draggableElement || !(evt.target instanceof Node)) return;

      if (!draggableElement.contains(evt.target)) {
        finishDragRef.current();
      }
    };

    const handleWindowBlur = () => {
      finishDragRef.current();
    };

    document.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);
    document.addEventListener("pointerdown", handleGlobalPointerDown, true);
    window.addEventListener("blur", handleWindowBlur);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerEnd);
      document.removeEventListener(
        "pointerdown",
        handleGlobalPointerDown,
        true,
      );
      window.removeEventListener("blur", handleWindowBlur);
      visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, [isDragging, isLocked, ref]);

  return {
    handlePointerDown,
    isDragging,
    cancelDrag: () => finishDragRef.current(),
  };
};
