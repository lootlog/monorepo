import type { FC } from "react";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import {
  DraggableWindowFrame,
  type DraggableWindowFrameProps,
} from "./draggable-window-frame";
import { PerformanceProfiler } from "@/lib/performance-monitoring/performance-profiler";

export type DraggableWindowProps = Omit<
  DraggableWindowFrameProps,
  "animationPhase" | "onWindowAnimationEnd"
> & {
  isOpen: boolean;
};

export const DraggableWindow: FC<DraggableWindowProps> = ({
  isOpen,
  ...windowProps
}) => {
  const { onAnimationEnd, phase, shouldRender } = useWindowPresence(isOpen);

  if (!shouldRender) return null;

  return (
    <PerformanceProfiler id={`window.${windowProps.id}`}>
      <DraggableWindowFrame
        {...windowProps}
        animationPhase={phase}
        onWindowAnimationEnd={onAnimationEnd}
      />
    </PerformanceProfiler>
  );
};
