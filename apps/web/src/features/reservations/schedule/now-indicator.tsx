import { useEffect, useState, useMemo, forwardRef } from "react";
import { DAYS, LABEL_COLUMN_WIDTH, HOURS } from "./constants";

type NowIndicatorProps = {
  weekStart: Date;
};

export const NowIndicator = forwardRef<HTMLDivElement, NowIndicatorProps>(
  ({ weekStart }, ref) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => {
        setNow(new Date());
      }, 60_000);
      return () => clearInterval(timer);
    }, []);

    const position = useMemo(() => {
      const weekStartTime = weekStart.getTime();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndTime = weekEnd.getTime();
      const nowTime = now.getTime();

      if (nowTime < weekStartTime || nowTime > weekEndTime) {
        return null;
      }

      const dayIdx = Math.floor(
        (nowTime - weekStartTime) / (24 * 60 * 60 * 1000),
      );

      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + dayIdx);
      dayStart.setHours(0, 0, 0, 0);

      const hoursFraction = (nowTime - dayStart.getTime()) / (1000 * 60 * 60);
      const topPercent = (hoursFraction / HOURS.length) * 100;

      return { dayIdx, topPercent };
    }, [now, weekStart]);

    if (!position) {
      return null;
    }

    const dayWidthExpr = `(100% - ${LABEL_COLUMN_WIDTH}px) / ${DAYS.length}`;
    const leftExpression = `calc(${LABEL_COLUMN_WIDTH}px + (${position.dayIdx} * ${dayWidthExpr}))`;
    const widthExpression = `calc(${dayWidthExpr})`;

    return (
      <div
        ref={ref}
        className="absolute z-20 pointer-events-none flex items-center"
        style={{
          left: leftExpression,
          width: widthExpression,
          top: `${position.topPercent}%`,
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1.5 shadow-sm" />
        <div className="flex-1 h-0.5 bg-destructive shadow-sm" />
      </div>
    );
  },
);

NowIndicator.displayName = "NowIndicator";
