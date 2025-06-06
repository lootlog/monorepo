import { useDrag } from "@/hooks/ui/useDrag";
import { cn } from "@/lib/utils";
import {
  useWindowsStore,
  WindowId,
  WindowOpacity,
} from "@/store/windows.store";
import { FC, useEffect, useRef, useState } from "react";

export type DraggableWindowProps = {
  children: React.ReactNode;
  id: WindowId;
  actions?: React.ReactNode;
  title: string;
  onClose?: () => void;
  variant?: "default" | "small";
};

const OPACITY_LEVELS: WindowOpacity[] = [1, 2, 3, 4];

export const DraggableWindow: FC<DraggableWindowProps> = ({
  children,
  id,
  actions,
  title,
  onClose,
  variant = "small",
}) => {
  const state = useWindowsStore();
  const opacity = state[id].opacity;
  const rawDefaultPosition = state[id].position;

  const getClampedPosition = (pos: { x: number; y: number }) => {
    if (typeof window === "undefined") return pos;
    const width = variant === "default" ? 400 : 242;
    const height = 400; // Adjust if you know the window's height
    const maxX = window.innerWidth - width;
    const maxY = window.innerHeight - height;
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY)),
    };
  };

  const defaultPosition = getClampedPosition(rawDefaultPosition);

  const draggableRef = useRef(null);
  const { position, handleMouseDown } = useDrag({
    ref: draggableRef,
    defaultState: defaultPosition,
    onDragStop: (position) => {
      state.setPosition(id, position);
    },
  });

  const handleOpacityChange = () => {
    const currentIndex = OPACITY_LEVELS.indexOf(opacity);
    const nextIndex = (currentIndex + 1) % OPACITY_LEVELS.length;
    state.setOpacity(id, OPACITY_LEVELS[nextIndex]);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    state.setCurrentWindowFocus(id);
    handleMouseDown(e as React.MouseEvent<HTMLElement, MouseEvent>);
  };

  return (
    <div
      className="ll-pointer-events-auto ll-absolute"
      ref={draggableRef}
      style={{
        top: position.y,
        left: position.x,
        zIndex: state.currentWindowFocus === id ? 2 : 1,
      }}
      onMouseDown={onMouseDown}
      onWheel={(e) => e.stopPropagation()}
      onClick={handleClick}
    >
      <div
        className={cn(
          "ll-w-[242px] ll-rounded-lg ll-border-solid ll-border ll-border-white/50 ll-p-1 !ll-relative ll-box-border ll-text-white",
          {
            "ll-bg-black/0": opacity === 1,
            "ll-bg-black/25": opacity === 2,
            "ll-bg-black/50": opacity === 3,
            "ll-bg-black/75": opacity === 4,
            "ll-w-[400px]": variant === "default",
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
