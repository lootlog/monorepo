type SignalRouteProps = {
  className?: string;
  color: "amber" | "coral" | "cyan" | "lime";
  direction?: "left" | "right";
  motionEnabled?: boolean;
};

const colorClasses = {
  amber: "text-[#ffbd3f]",
  coral: "text-[#ff665b]",
  cyan: "text-[#35d3e4]",
  lime: "text-[#c8f135]",
} as const;

export function SignalRoute({
  className,
  color,
  direction = "right",
  motionEnabled = false,
}: SignalRouteProps) {
  const path =
    direction === "right"
      ? "M-24 172 H180 C252 172 248 56 330 56 H612 C690 56 686 202 770 202 H1054"
      : "M1054 172 H844 C768 172 776 52 690 52 H420 C342 52 350 204 264 204 H-24";
  const nodeX = direction === "right" ? 330 : 690;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1030 256"
      preserveAspectRatio="none"
      className={[
        "pointer-events-none absolute inset-x-0 h-64 w-full overflow-visible",
        colorClasses[color],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        pathLength="1"
        className={motionEnabled ? "signal-draw" : undefined}
      />
      <circle cx={nodeX} cy="56" r="22" fill="currentColor" />
      <circle cx={nodeX} cy="56" r="9" fill="#07111f" />
      <circle
        cx={nodeX}
        cy="56"
        r="34"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.42"
        className={motionEnabled ? "signal-pulse" : undefined}
      />
    </svg>
  );
}
