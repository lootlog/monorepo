import type { FC } from "react";

export const RiasEmptyStateIcon: FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer magic circle */}
      <circle
        cx="60"
        cy="60"
        r="55"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.12"
        strokeDasharray="5 4"
      />
      <circle
        cx="60"
        cy="60"
        r="48"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.08"
      />

      {/* Chess King piece silhouette */}
      {/* Cross on top */}
      <line
        x1="60"
        y1="18"
        x2="60"
        y2="28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="55"
        y1="22"
        x2="65"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Crown top (crenellations) */}
      <path
        d="M47 38 L47 32 L50 35 L53 30 L57 34 L60 28 L63 34 L67 30 L70 35 L73 32 L73 38 Z"
        fill="currentColor"
        opacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeOpacity="0.25"
      />

      {/* Body */}
      <path
        d="M47 38 L45 55 Q44 60 46 62 L48 64 L44 82 Q43 86 47 88 L73 88 Q77 86 76 82 L72 64 L74 62 Q76 60 75 55 L73 38"
        fill="currentColor"
        opacity="0.08"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeOpacity="0.2"
      />

      {/* Waist band */}
      <rect
        x="47"
        y="54"
        width="26"
        height="5"
        rx="1"
        fill="currentColor"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.15"
      />

      {/* Base */}
      <path
        d="M42 88 Q40 90 40 93 L40 96 Q40 99 44 100 L76 100 Q80 99 80 96 L80 93 Q80 90 78 88"
        fill="currentColor"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeOpacity="0.2"
      />

      {/* Subtle glow particles */}
      <circle cx="35" cy="40" r="1.5" fill="currentColor" opacity="0.1" />
      <circle cx="85" cy="40" r="1" fill="currentColor" opacity="0.08" />
      <circle cx="30" cy="75" r="1" fill="currentColor" opacity="0.08" />
      <circle cx="90" cy="75" r="1.5" fill="currentColor" opacity="0.1" />
      <circle cx="60" cy="110" r="1" fill="currentColor" opacity="0.06" />
    </svg>
  );
};
