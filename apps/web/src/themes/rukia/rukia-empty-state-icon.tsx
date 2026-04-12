import type { FC } from "react";

export const RukiaEmptyStateIcon: FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer snowflake - main axes */}
      <line
        x1="60"
        y1="8"
        x2="60"
        y2="112"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="8"
        y1="60"
        x2="112"
        y2="60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="22.2"
        y1="22.2"
        x2="97.8"
        y2="97.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.2"
      />
      <line
        x1="97.8"
        y1="22.2"
        x2="22.2"
        y2="97.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.2"
      />

      {/* Branch tips - top */}
      <line
        x1="60"
        y1="8"
        x2="53"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="8"
        x2="67"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      {/* Branch tips - bottom */}
      <line
        x1="60"
        y1="112"
        x2="53"
        y2="100"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="112"
        x2="67"
        y2="100"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      {/* Branch tips - left */}
      <line
        x1="8"
        y1="60"
        x2="20"
        y2="53"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="60"
        x2="20"
        y2="67"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      {/* Branch tips - right */}
      <line
        x1="112"
        y1="60"
        x2="100"
        y2="53"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="112"
        y1="60"
        x2="100"
        y2="67"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
        strokeLinecap="round"
      />

      {/* Inner hexagonal ring */}
      <polygon
        points="60,30 86,45 86,75 60,90 34,75 34,45"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.05"
        strokeOpacity="0.2"
        strokeLinejoin="round"
      />

      {/* Center ice flower - Sode no Shirayuki petals */}
      <ellipse
        cx="60"
        cy="48"
        rx="5"
        ry="10"
        fill="currentColor"
        opacity="0.12"
        transform="rotate(0, 60, 60)"
      />
      <ellipse
        cx="60"
        cy="48"
        rx="5"
        ry="10"
        fill="currentColor"
        opacity="0.12"
        transform="rotate(72, 60, 60)"
      />
      <ellipse
        cx="60"
        cy="48"
        rx="5"
        ry="10"
        fill="currentColor"
        opacity="0.12"
        transform="rotate(144, 60, 60)"
      />
      <ellipse
        cx="60"
        cy="48"
        rx="5"
        ry="10"
        fill="currentColor"
        opacity="0.12"
        transform="rotate(216, 60, 60)"
      />
      <ellipse
        cx="60"
        cy="48"
        rx="5"
        ry="10"
        fill="currentColor"
        opacity="0.12"
        transform="rotate(288, 60, 60)"
      />

      {/* Center dot */}
      <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.3" />

      {/* Small scattered crystals */}
      <circle cx="30" cy="30" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="90" cy="30" r="1" fill="currentColor" opacity="0.12" />
      <circle cx="30" cy="90" r="1" fill="currentColor" opacity="0.12" />
      <circle cx="90" cy="90" r="1.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
};
