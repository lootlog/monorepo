import { forwardRef, useEffect, useState } from "react";
import {
  HEADER_HEIGHT,
  MIN_ROW_HEIGHT,
  DAYS,
  LABEL_COLUMN_WIDTH,
} from "./constants";

type NowIndicatorProps = {
  weekStart: Date;
};

export const NowIndicator = forwardRef<HTMLDivElement, NowIndicatorProps>(
  ({ weekStart }, ref) => {
    const [position, setPosition] = useState<{
      top: number;
      leftExpression: string;
      widthExpression: string;
    } | null>(null);

    useEffect(() => {
      const updatePosition = () => {
        const now = new Date();
        const diff = now.getTime() - weekStart.getTime();
        const diffDays = Math.floor(diff / (24 * 60 * 60 * 1000));

        if (diffDays >= 0 && diffDays < DAYS.length) {
          const hours = now.getHours() + now.getMinutes() / 60;
          const top = HEADER_HEIGHT + hours * MIN_ROW_HEIGHT; // Pixel offset

          const dayWidthExpr = `(100% - ${LABEL_COLUMN_WIDTH}px) / ${DAYS.length}`;
          const leftExpression = `calc(${LABEL_COLUMN_WIDTH}px + (${diffDays} * ${dayWidthExpr}))`;
          const widthExpression = `calc(${dayWidthExpr})`;

          setPosition({ top, leftExpression, widthExpression });
        } else {
          setPosition(null);
        }
      };

      updatePosition(); // Initial call
      const timer = setInterval(updatePosition, 60_000); // Update every minute
      return () => clearInterval(timer);
    }, [weekStart]);

    if (!position) {
      return null;
    }

    return (
      <div
        ref={ref}
        className="absolute z-20 pointer-events-none flex items-center"
        style={{
          left: position.leftExpression,
          width: position.widthExpression,
          top: `${position.top}px`,
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1.5 shadow-sm" />
        <div className="flex-1 h-0.5 bg-destructive shadow-sm" />
      </div>
    );
  },
);

NowIndicator.displayName = "NowIndicator";
