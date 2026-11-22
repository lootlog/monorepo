import type { CSSProperties, Ref } from "react";

type ScheduleNowLineProps = {
  style: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

export const ScheduleNowLine = ({ style, ref }: ScheduleNowLineProps) => (
  <div
    ref={ref}
    aria-hidden="true"
    className="pointer-events-none absolute z-20 h-0.5 -translate-y-1/2 bg-destructive"
    style={style}
  >
    <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-destructive" />
  </div>
);
