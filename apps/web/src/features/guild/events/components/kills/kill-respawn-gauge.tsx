import { cn } from "cn";

const RADIUS = 20;

const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MIN_VISIBLE_FILL = 0.02;

type KillRespawnGaugeProps = {
  fill: number;
  isOverdue: boolean;
};

export const KillRespawnGauge = ({
  fill,
  isOverdue,
}: KillRespawnGaugeProps) => (
  <svg viewBox="0 0 48 48" className="size-12 shrink-0 -rotate-90" aria-hidden>
    <circle
      cx="24"
      cy="24"
      r={RADIUS}
      fill="none"
      strokeWidth="5"
      className="stroke-muted"
    />
    <circle
      cx="24"
      cy="24"
      r={RADIUS}
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
      strokeDasharray={`${CIRCUMFERENCE * Math.max(fill, MIN_VISIBLE_FILL)} ${CIRCUMFERENCE}`}
      className={cn(isOverdue ? "stroke-signal-timer" : "stroke-primary")}
    />
  </svg>
);
