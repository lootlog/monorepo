import { ScrollArea } from "@/components/ui/scroll-area";
import { useDrag } from "@/hooks/ui/useDrag";
import { cn } from "@/lib/utils";
import { FC, useEffect, useRef } from "react";
import { useLocalStorage } from "react-use";

export type DraggableWindowProps = {
  children: React.ReactNode;
  id: string;
  actions?: React.ReactNode;
  title: string;
  onClose?: () => void;
};

const DEFAULT_OPACITY_LVL = 4;
const OPACITY_LEVELS = [1, 2, 3, 4];

export const DraggableWindow: FC<DraggableWindowProps> = ({
  children,
  id,
  actions,
  title,
  onClose,
}) => {
  const [opacityLvl, setOpacityLvl] = useLocalStorage(
    `draggable-window-opacity-${id}`,
    DEFAULT_OPACITY_LVL
  );
  const [localStoragePosition, setLocalStoragePosition] = useLocalStorage(
    `draggable-window-${id}`,
    {
      x: 0,
      y: 0,
    }
  );
  const draggableRef = useRef(null);
  const { position, handleMouseDown } = useDrag({
    ref: draggableRef,
    defaultState: localStoragePosition,
    onDragStop: (position) => {
      setLocalStoragePosition(position);
    },
  });

  const handleOpacityChange = () => {
    const currentIndex = OPACITY_LEVELS.indexOf(
      opacityLvl ?? DEFAULT_OPACITY_LVL
    );
    const nextIndex = (currentIndex + 1) % OPACITY_LEVELS.length;
    setOpacityLvl(OPACITY_LEVELS[nextIndex]);
  };

  return (
    <div
      className="ll-pointer-events-auto ll-absolute"
      ref={draggableRef}
      style={{
        top: position.y,
        left: position.x,
      }}
      onMouseDown={handleMouseDown}
      onWheel={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "ll-w-[242px]  ll-rounded-lg ll-border-solid ll-border ll-border-white/50 ll-p-1 !ll-relative ll-box-border ll-text-white",
          {
            "ll-bg-black/0": opacityLvl === 1,
            "ll-bg-black/25": opacityLvl === 2,
            "ll-bg-black/50": opacityLvl === 3,
            "ll-bg-black/75": opacityLvl === 4,
          }
        )}
      >
        <div className="ll-flex ll-items-center ll-justify-between ll-px-1">
          <div className="ll-flex ll-items-center ll-gap-1">
            <div
              className="ll-opacity-button ll-custom-cursor-pointer ll-mt-0.5"
              onClick={handleOpacityChange}
            />
            {actions}
          </div>
          <p className="ll-text-[11px] ll-background-[0_0] ll-text-[beige] ll-line-height-[28px] ll-text-shadow-[1px_1px_1px_black] ll-custom-cursor-pointer ll-absolute ll-left-1/2 ll-transform ll--translate-x-1/2">
            {title}
          </p>
          <button
            type="button"
            className="ll-close-button ll-custom-cursor-pointer"
            onClick={onClose}
          />
        </div>
        {children}
      </div>
    </div>
  );
};
