import { Reorder, useDragControls } from "framer-motion";
import { cn } from "cn";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

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
  className?: string;
};

export const GuildReorderItem = <T,>({
  value,
  children,
  onDragStart,
  onDragEnd,
  className,
}: GuildReorderItemProps<T>) => {
  const dragControls = useDragControls();
  const itemRef = useRef<HTMLLIElement>(null);
  const hold = useRef<TouchHold | null>(null);
  const suppressClick = useRef(false);
  const [isLifted, setIsLifted] = useState(false);

  useEffect(() => {
    const item = itemRef.current;

    if (!item) return;

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
      className={cn(
        "flex items-center justify-center select-none cursor-grab active:cursor-grabbing",
        className,
      )}
      animate={{ scale: isLifted ? 1.1 : 1, transition: LIFT_TRANSITION }}
      whileDrag={{ scale: 1.1, zIndex: 50, transition: LIFT_TRANSITION }}
    >
      {children}
    </Reorder.Item>
  );
};
