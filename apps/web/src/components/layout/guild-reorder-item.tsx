import { Reorder, useDragControls } from "framer-motion";
import type { ReactNode } from "react";

type GuildReorderItemProps<T> = {
  value: T;
  children: ReactNode;
  onDragStart: () => void;
  onDragEnd: () => void;
};

// Reorder.Item's own drag listener sets `touch-action: pan-x`, which blocks
// vertical scrolling of the rail on touch screens, so drag starts only from a
// mouse or pen and touch keeps native scrolling.
export const GuildReorderItem = <T,>({
  value,
  children,
  onDragStart,
  onDragEnd,
}: GuildReorderItemProps<T>) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") {
          dragControls.start(event);
        }
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="w-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      whileDrag={{
        scale: 1.1,
        zIndex: 50,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }}
    >
      {children}
    </Reorder.Item>
  );
};
