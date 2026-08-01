import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { getRuntimeZoomFactor } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  addMeasuredEventListener,
  requestMeasuredAnimationFrame,
  setMeasuredTimeout,
} from "@/lib/performance-monitoring/measured-callback";

const getScale = () => {
  return getRuntimeZoomFactor() ?? window.visualViewport?.scale ?? 1;
};

type Position = { x: number; y: number };

type DragInfo = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

const DEFAULT_STATE: Position = { x: 0, y: 0 };
const DEFAULT_DRAG_INFO: DragInfo = {
  offsetX: 0,
  offsetY: 0,
  width: 0,
  height: 0,
};

let dragSessionCounter = 0;
let activeDragSessionId: number | null = null;

const getNextDragSessionId = () => {
  dragSessionCounter += 1;
  return dragSessionCounter;
};

type UseDragConfig = {
  ref: React.RefObject<HTMLDivElement | null>;
  calculateFor?: "topLeft" | "bottomRight";
  defaultState?: Position;
  onDragStop: (position: Position) => void;
  isLocked?: boolean;
};

export const useDrag = ({
  ref,
  calculateFor = "topLeft",
  defaultState = DEFAULT_STATE,
  onDragStop,
  isLocked = false,
}: UseDragConfig) => {
  const [finalPosition, setFinalPosition] = useState(defaultState);
  const [isDragging, setIsDragging] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragInfoRef = useRef<DragInfo>(DEFAULT_DRAG_INFO);
  const dragSessionRef = useRef<number | null>(null);
  const finalPositionRef = useRef(defaultState);
  const dragOriginPositionRef = useRef(defaultState);
  const isDraggingRef = useRef(false);
  const hasDragStylesRef = useRef(false);
  const pendingPositionRef = useRef<Position | null>(null);
  const positionFrameRef = useRef<number | null>(null);
  const calculateForRef = useRef(calculateFor);
  const isLockedRef = useRef(isLocked);
  const onDragStopRef = useRef(onDragStop);

  useEffect(() => {
    calculateForRef.current = calculateFor;
    isLockedRef.current = isLocked;
    onDragStopRef.current = onDragStop;
  }, [calculateFor, isLocked, onDragStop]);

  const queuePosition = (
    width: number,
    height: number,
    x: number,
    y: number,
  ) => {
    const scale = getScale();
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const scaledViewportWidth = viewportWidth * scale;
    const scaledViewportHeight = viewportHeight * scale;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    let nextPosition: Position;

    if (calculateForRef.current === "bottomRight") {
      nextPosition = {
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
      nextPosition = {
        x: Math.min(Math.max(0, x), scaledViewportWidth - scaledWidth),
        y: Math.min(Math.max(0, y), scaledViewportHeight - scaledHeight),
      };
    }

    if (
      nextPosition.x === finalPositionRef.current.x &&
      nextPosition.y === finalPositionRef.current.y
    ) {
      return;
    }

    finalPositionRef.current = nextPosition;
    pendingPositionRef.current = nextPosition;
    if (positionFrameRef.current !== null) return;

    positionFrameRef.current = requestMeasuredAnimationFrame(
      "window-drag.position-frame",
      () => {
        positionFrameRef.current = null;
        const pendingPosition = pendingPositionRef.current;
        pendingPositionRef.current = null;
        if (!pendingPosition) return;

        if (isDraggingRef.current) {
          const draggableElement = ref.current;
          if (!draggableElement) return;
          const dragOriginPosition = dragOriginPositionRef.current;
          const translateX = pendingPosition.x - dragOriginPosition.x;
          const translateY = pendingPosition.y - dragOriginPosition.y;
          draggableElement.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
          return;
        }

        setFinalPosition(pendingPosition);
      },
    );
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
    const stoppedPosition =
      pendingPositionRef.current ?? finalPositionRef.current;
    pendingPositionRef.current = null;
    finalPositionRef.current = stoppedPosition;
    setFinalPosition(stoppedPosition);
    onDragStopRef.current(stoppedPosition);
    setIsDragging(false);
  };
  const finishDragRef = useRef(finishDrag);

  useEffect(() => {
    finishDragRef.current = finishDrag;
  });

  const startDrag = (x: number, y: number) => {
    if (isLockedRef.current) return false;
    const draggableElement = ref.current;
    if (!draggableElement) return false;
    const { width, height } = draggableElement.getBoundingClientRect();
    const sessionId = getNextDragSessionId();

    activeDragSessionId = sessionId;
    dragSessionRef.current = sessionId;
    dragInfoRef.current = {
      offsetX: x - finalPositionRef.current.x,
      offsetY: y - finalPositionRef.current.y,
      width,
      height,
    };
    dragOriginPositionRef.current = finalPositionRef.current;
    isDraggingRef.current = true;
    draggableElement.style.willChange = "transform";
    hasDragStylesRef.current = true;
    setIsDragging(true);
    return true;
  };

  const handlePointerDown = (evt: ReactPointerEvent<HTMLElement>) => {
    if (isLockedRef.current) return;
    if (!evt.isPrimary || evt.button !== 0) return;
    if (!(evt.target instanceof HTMLElement)) return;
    if (evt.target.getAttribute("data-state") === "input") return;
    if (evt.target.getAttribute("data-slot") === "hidden") return;
    if (evt.target.closest("[data-ll-draggable='false']")) return;

    const scale = evt.pointerType === "touch" ? getScale() : 1;
    if (!startDrag(evt.clientX * scale, evt.clientY * scale)) return;

    activePointerIdRef.current = evt.pointerId;
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

  useLayoutEffect(() => {
    if (isDragging || !hasDragStylesRef.current) return;
    const draggableElement = ref.current;
    if (!draggableElement) return;

    draggableElement.style.transform = "";
    draggableElement.style.willChange = "";
    hasDragStylesRef.current = false;
  }, [finalPosition, isDragging, ref]);

  useEffect(() => {
    if (isLocked) return;
    let timeoutId: number | undefined;

    const handleResize = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setMeasuredTimeout(
        "window-drag.resize",
        () => {
          if (isLockedRef.current) return;
          const draggableElement = ref.current;
          if (!draggableElement) return;
          const { width, height } = draggableElement.getBoundingClientRect();
          const previousPosition = finalPositionRef.current;
          const x = Math.min(
            Math.max(0, previousPosition.x),
            window.innerWidth - width,
          );
          const y = Math.min(
            Math.max(0, previousPosition.y),
            window.innerHeight - height,
          );
          if (x === previousPosition.x && y === previousPosition.y) return;

          const nextPosition = { x, y };
          finalPositionRef.current = nextPosition;
          setFinalPosition(nextPosition);
          onDragStopRef.current(nextPosition);
        },
        100,
      );
    };

    const removeResize = addMeasuredEventListener(
      window,
      "resize",
      handleResize,
      "window-drag.resize-listener",
    );
    return () => {
      removeResize();
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [ref, isLocked]);

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
      const scale = evt.pointerType === "touch" ? getScale() : 1;
      const { offsetX, offsetY, width, height } = dragInfoRef.current;
      queuePositionRef.current(
        width,
        height,
        evt.clientX * scale - offsetX,
        evt.clientY * scale - offsetY,
      );
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

    const removeListeners = [
      addMeasuredEventListener(
        document,
        "pointermove",
        handlePointerMove as EventListener,
        "window-drag.pointermove",
        { passive: false },
      ),
      addMeasuredEventListener(
        document,
        "pointerup",
        handlePointerEnd as EventListener,
        "window-drag.pointerup",
      ),
      addMeasuredEventListener(
        document,
        "pointercancel",
        handlePointerEnd as EventListener,
        "window-drag.pointercancel",
      ),
      addMeasuredEventListener(
        document,
        "pointerdown",
        handleGlobalPointerDown as EventListener,
        "window-drag.global-pointerdown",
        true,
      ),
      addMeasuredEventListener(
        window,
        "blur",
        handleWindowBlur,
        "window-drag.blur",
      ),
    ];

    return () => {
      for (const removeListener of removeListeners) removeListener();
    };
  }, [isDragging, isLocked, ref]);

  const recalculate = (width?: number, height?: number) => {
    const draggableElement = ref.current;
    if (!draggableElement) return;
    const {
      top,
      left,
      width: renderedWidth,
      height: renderedHeight,
    } = draggableElement.getBoundingClientRect();
    queuePositionRef.current(
      width ?? renderedWidth,
      height ?? renderedHeight,
      left,
      top,
    );
  };

  return {
    position: finalPosition,
    handlePointerDown,
    recalculate,
    isDragging,
    cancelDrag: () => finishDragRef.current(),
  };
};
