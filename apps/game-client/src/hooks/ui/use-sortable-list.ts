import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { getRuntimeUiScale } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

type RowRect = { id: string; top: number; height: number };

type DragSession = {
  pointerId: number;
  id: string;
  fromIndex: number;
  startY: number;
  scale: number;
  rects: RowRect[];
  element: HTMLElement;
  /** Latest pointer offset, applied once per frame. */
  pendingDeltaY: number | null;
  frameId: number | null;
};

type DragState = { id: string; fromIndex: number; overIndex: number };

export type SortableMove = { id: string; index: number };

type UseSortableListConfig = {
  /** Ids in their current display order. */
  ids: readonly string[];
  onReorder: (ids: string[]) => void;
  disabled?: boolean;
};

export const moveId = (
  ids: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] => {
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);

  if (moved === undefined) return next;

  next.splice(toIndex, 0, moved);

  return next;
};

/**
 * Vertical reorder for a list of rows. The handle of a row starts a pointer
 * drag; the dragged row follows the pointer while the others slide out of
 * its way, and the new order is committed on release. Arrow keys on a focused
 * handle move the row one step at a time so the list is fully keyboard
 * operable. Rows are addressed by id so the caller keeps its own rendering.
 */
export const useSortableList = ({
  ids,
  onReorder,
  disabled = false,
}: UseSortableListConfig) => {
  const [dragState, setDragStateValue] = useState<DragState | null>(null);
  const [lastMove, setLastMove] = useState<SortableMove | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const setDragState = (next: DragState | null) => {
    dragStateRef.current = next;
    setDragStateValue(next);
  };

  const rowElementsRef = useRef(new Map<string, HTMLElement>());
  const sessionRef = useRef<DragSession | null>(null);
  const idsRef = useRef(ids);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    idsRef.current = ids;
    onReorderRef.current = onReorder;
  }, [ids, onReorder]);

  const finishDrag = (commit: boolean) => {
    const session = sessionRef.current;

    if (!session) return;

    sessionRef.current = null;

    if (session.frameId !== null) {
      window.cancelAnimationFrame(session.frameId);
    }

    session.element.style.transform = "";
    session.element.style.willChange = "";

    const current = dragStateRef.current;
    setDragState(null);

    if (commit && current && current.overIndex !== current.fromIndex) {
      onReorderRef.current(
        moveId(idsRef.current, current.fromIndex, current.overIndex),
      );
      setLastMove({ id: current.id, index: current.overIndex });
    }
  };

  const finishDragRef = useRef(finishDrag);

  useEffect(() => {
    finishDragRef.current = finishDrag;
  });

  useEffect(() => {
    if (!dragState) return;

    if (disabled) {
      finishDragRef.current(false);

      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;

      if (!session || event.pointerId !== session.pointerId) return;

      if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
        finishDragRef.current(true);

        return;
      }

      event.preventDefault();
      session.pendingDeltaY = event.clientY * session.scale - session.startY;

      if (session.frameId !== null) return;

      session.frameId = window.requestAnimationFrame(() => {
        session.frameId = null;
        const deltaY = session.pendingDeltaY;

        if (deltaY === null || sessionRef.current !== session) return;

        session.element.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        const overIndex = findOverIndex(session, deltaY);
        const current = dragStateRef.current;

        if (current && current.overIndex !== overIndex) {
          setDragState({ ...current, overIndex });
        }
      });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId === sessionRef.current?.pointerId) {
        finishDragRef.current(event.type === "pointerup");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishDragRef.current(false);
    };

    const handleWindowBlur = () => finishDragRef.current(false);

    document.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerEnd);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [dragState, disabled]);

  useEffect(
    () => () => {
      const session = sessionRef.current;

      if (!session) return;

      sessionRef.current = null;

      if (session.frameId !== null) {
        window.cancelAnimationFrame(session.frameId);
      }

      session.element.style.transform = "";
      session.element.style.willChange = "";
    },
    [],
  );

  const startDrag = (id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || sessionRef.current) return;

    if (!event.isPrimary || event.button !== 0) return;

    const fromIndex = ids.indexOf(id);
    const element = rowElementsRef.current.get(id);

    if (fromIndex === -1 || !element) return;

    const rects: RowRect[] = [];

    for (const rowId of ids) {
      const rowElement = rowElementsRef.current.get(rowId);

      if (!rowElement) return;

      const { top, height } = rowElement.getBoundingClientRect();
      rects.push({ id: rowId, top, height });
    }

    const scale = event.pointerType === "touch" ? getRuntimeUiScale() : 1;

    sessionRef.current = {
      pointerId: event.pointerId,
      id,
      fromIndex,
      startY: event.clientY * scale,
      scale,
      rects,
      element,
      pendingDeltaY: null,
      frameId: null,
    };
    element.style.willChange = "transform";
    event.preventDefault();
    event.stopPropagation();
    setDragState({ id, fromIndex, overIndex: fromIndex });
  };

  const moveByKeyboard = (id: string, event: ReactKeyboardEvent) => {
    if (disabled) return;

    const fromIndex = ids.indexOf(id);

    if (fromIndex === -1) return;

    const toIndex = keyboardTargetIndex(event.key, fromIndex, ids.length);

    if (toIndex === null) return;

    event.preventDefault();

    if (toIndex === fromIndex) return;

    onReorder(moveId(ids, fromIndex, toIndex));
    setLastMove({ id, index: toIndex });
  };

  const getRowProps = (id: string) => {
    const index = ids.indexOf(id);
    let transform: string | undefined;

    if (dragState && dragState.id !== id) {
      const session = sessionRef.current;
      const draggedHeight = session?.rects[dragState.fromIndex]?.height ?? 0;
      const { fromIndex, overIndex } = dragState;

      if (fromIndex < overIndex && index > fromIndex && index <= overIndex) {
        transform = `translate3d(0, ${-draggedHeight}px, 0)`;
      } else if (
        fromIndex > overIndex &&
        index >= overIndex &&
        index < fromIndex
      ) {
        transform = `translate3d(0, ${draggedHeight}px, 0)`;
      }
    }

    const style: CSSProperties | undefined = transform
      ? { transform }
      : undefined;

    return {
      ref: (element: HTMLElement | null) => {
        if (element) {
          rowElementsRef.current.set(id, element);
        } else {
          rowElementsRef.current.delete(id);
        }
      },
      style,
      "data-sortable-dragging": dragState?.id === id ? "" : undefined,
    };
  };

  const getHandleProps = (id: string) => ({
    disabled,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
      startDrag(id, event),
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) =>
      moveByKeyboard(id, event),
  });

  return {
    draggingId: dragState?.id ?? null,
    /** Last row moved by keyboard or drop, for a live announcement. */
    lastMove,
    getRowProps,
    getHandleProps,
  };
};

const keyboardTargetIndex = (
  key: string,
  fromIndex: number,
  count: number,
): number | null => {
  switch (key) {
    case "ArrowUp":
      return Math.max(0, fromIndex - 1);
    case "ArrowDown":
      return Math.min(count - 1, fromIndex + 1);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
};

/**
 * Index the dragged row would take if dropped now: the slot whose row centre
 * the dragged row's centre has crossed, measured against the layout captured
 * when the drag started (rows only translate while dragging, so those rects
 * stay valid).
 */
const findOverIndex = (session: DragSession, deltaY: number): number => {
  const dragged = session.rects[session.fromIndex];

  if (!dragged) return session.fromIndex;

  const center = dragged.top + dragged.height / 2 + deltaY;
  let overIndex = session.fromIndex;

  if (deltaY < 0) {
    for (let index = session.fromIndex - 1; index >= 0; index -= 1) {
      const rect = session.rects[index];

      if (!rect || center > rect.top + rect.height / 2) break;

      overIndex = index;
    }
  } else {
    for (
      let index = session.fromIndex + 1;
      index < session.rects.length;
      index += 1
    ) {
      const rect = session.rects[index];

      if (!rect || center < rect.top + rect.height / 2) break;

      overIndex = index;
    }
  }

  return overIndex;
};
