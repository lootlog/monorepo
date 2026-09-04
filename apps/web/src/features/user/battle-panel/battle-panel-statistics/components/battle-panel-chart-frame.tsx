import { cn } from "cn";
import { useEffect, useRef, useState, type ReactNode } from "react";

type BattlePanelChartFrameProps = {
  children: ReactNode;
  className?: string;
};

export const BattlePanelChartFrame = ({
  children,
  className,
}: BattlePanelChartFrameProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const updateReadiness = () => {
      const rect = elementRef.current?.getBoundingClientRect();
      setIsReady(Boolean(rect && rect.width > 0 && rect.height > 0));
    };

    updateReadiness();

    if (typeof ResizeObserver === "undefined") {
      const animationFrame = window.requestAnimationFrame(updateReadiness);

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    const resizeObserver = new ResizeObserver(updateReadiness);

    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={elementRef} className={cn("min-w-0", className)}>
      {isReady ? children : null}
    </div>
  );
};
