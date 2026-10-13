import { Reorder, useDragControls } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

// Shorter than the 500 ms long press that opens the guild context menu, so a
// hold followed by a move drags while a still hold still opens the menu.
const TOUCH_HOLD_DELAY_MS = 250;

const TOUCH_HOLD_TOLERANCE_PX = 8;

const LIFT_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

type TouchHold = {
  origin: PointerEvent;
  timer: ReturnType<typeof setTimeout>;
  isLifted: boolean;
  isDragging: boolean;
};

type GuildReorderItemProps<T> = {
  value: T;
  children: ReactNode;
  onDragStart: () => void;
  onDragEnd: () => void;
};

// Reorder.Item's own drag listener sets `touch-action: pan-x`, which blocks
// vertical scrolling of the rail on touch screens. A mouse or pen drags right
// away; touch scrolls natively and drags only after a press and hold.
export const GuildReorderItem = <T,>({
  value,
  children,
  onDragStart,
  onDragEnd,
}: GuildReorderItemProps<T>) => {
  const dragControls = useDragControls();
  const itemRef = useRef<HTMLLIElement>(null);
  const hold = useRef<TouchHold | null>(null);
  const suppressClick = useRef(false);
  const [isLifted, setIsLifted] = useState(false);

  useEffect(() => {
    const item = itemRef.current;

    if (!item) return;

    // React listens to touchmove passively, so only a native listener can stop
    // the rail from scrolling under a lifted item.
    const preventScroll = (event: TouchEvent) => {
      if (hold.current?.isLifted) event.preventDefault();
    };

    item.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      item.removeEventListener("touchmove", preventScroll);

      if (hold.current) clearTimeout(hold.current.timer);
    };
  }, []);

  const releaseHold = () => {
    if (!hold.current) return;

    clearTimeout(hold.current.timer);
    suppressClick.current = hold.current.isLifted;
    hold.current = null;
    setIsLifted(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLLIElement>) => {
    if (event.pointerType !== "touch") {
      dragControls.start(event);

      return;
    }

    releaseHold();
    suppressClick.current = false;

    const touchHold: TouchHold = {
      origin: event.nativeEvent,
      isLifted: false,
      isDragging: false,
      timer: setTimeout(() => {
        touchHold.isLifted = true;
        setIsLifted(true);
      }, TOUCH_HOLD_DELAY_MS),
    };

    hold.current = touchHold;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
    const touchHold = hold.current;

    if (!touchHold || event.pointerId !== touchHold.origin.pointerId) return;

    if (!touchHold.isLifted) {
      const distance = Math.hypot(
        event.clientX - touchHold.origin.clientX,
        event.clientY - touchHold.origin.clientY,
      );

      if (distance > TOUCH_HOLD_TOLERANCE_PX) releaseHold();

      return;
    }

    // A still hold opened the context menu; the menu wins over the drag.
    if (itemRef.current?.querySelector("[data-popup-open]")) {
      if (touchHold.isDragging) dragControls.cancel();
      releaseHold();

      return;
    }

    if (!touchHold.isDragging) {
      touchHold.isDragging = true;
      dragControls.start(touchHold.origin);
    }
  };

  return (
    <Reorder.Item
      ref={itemRef}
      value={value}
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releaseHold}
      onPointerCancel={releaseHold}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;

        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="w-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      animate={{ scale: isLifted ? 1.1 : 1, transition: LIFT_TRANSITION }}
      whileDrag={{ scale: 1.1, zIndex: 50, transition: LIFT_TRANSITION }}
    >
      {children}
    </Reorder.Item>
  );
};
